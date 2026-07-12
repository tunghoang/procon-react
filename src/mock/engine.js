// Faithful JS port of the HEXUDON rule engine
// (production/procon26-hexudon/game_service.py). The game object handled by
// every function here is plain JSON data shaped exactly like Game.to_dict(),
// so it round-trips through localStorage unchanged.
//
// One deliberate deviation from the python `catch_up`: the real deployment
// has a background loop ticking every 5 s, so days resolve ON their
// deadlines. This mock advances lazily on request, so catchUp() walks the
// *virtual* timeline (each day starts exactly when the previous deadline
// passed) instead of stamping wall-clock times — otherwise a seeded
// in-the-past game could never have run its days.

export class GameError extends Error {}

const TERRAIN = { PLAIN: 0, ROAD: 1, MOUNTAIN: 2, POND: 3 };
const SMOOTH = 0;
const CONGESTED = 1;
const JAM = 2;

const ROAD_TRAVEL_TIME = { [SMOOTH]: 1, [CONGESTED]: 2, [JAM]: 4 };
const TRAVEL_TIME = { [TERRAIN.PLAIN]: 2, [TERRAIN.MOUNTAIN]: 3 };
const FUEL_COST = { [TERRAIN.PLAIN]: 1, [TERRAIN.ROAD]: 2, [TERRAIN.MOUNTAIN]: 2 };

// Clockwise from upper-left: NW, NE, E, SE, SW, W. Even rows shifted right.
const EVEN_ROW_DELTAS = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [0, -1]];
const ODD_ROW_DELTAS = [[-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1], [0, -1]];

const neighbor = (map, cell, direction) => {
	const row = Math.floor(cell / map.width);
	const col = cell % map.width;
	const [dr, dc] = (row % 2 === 0 ? EVEN_ROW_DELTAS : ODD_ROW_DELTAS)[direction];
	const nr = row + dr;
	const nc = col + dc;
	if (nr < 0 || nr >= map.height || nc < 0 || nc >= map.width) return null;
	return nr * map.width + nc;
};

const roadCells = (map) => {
	const cells = [];
	map.terrain.forEach((t, i) => {
		if (t === TERRAIN.ROAD) cells.push(i);
	});
	return cells;
};

const travelTime = (game, cell) => {
	const terrain = game.map.terrain[cell];
	if (terrain === TERRAIN.ROAD) {
		const cond = game.road_condition[String(cell)] ?? SMOOTH;
		return ROAD_TRAVEL_TIME[cond];
	}
	return TRAVEL_TIME[terrain];
};

const fuelCost = (game, cell) => FUEL_COST[game.map.terrain[cell]];

const dayConfig = (game, day) => {
	if (day >= 0 && day < game.day_configs.length) return game.day_configs[day];
	return { steps: 50, response_time: 60.0 };
};

const getTeam = (game, teamId) => {
	const team = game.teams[teamId];
	if (!team) throw new GameError(`unknown team ${teamId}`);
	return team;
};

// collected_today is serialized as [[agent_id, cell], ...]
const hasCollected = (team, agentId, cell) =>
	team.collected_today.some(([a, c]) => a === agentId && c === cell);

const addUnique = (arr, value) => {
	if (!arr.includes(value)) {
		arr.push(value);
		arr.sort((a, b) => a - b);
	}
};

// --------------------------------------------------------------------------
// Construction (Game.__init__ + GameMap validation)
// --------------------------------------------------------------------------

export function createGame(init) {
	const { map } = init;
	if (!(map.width >= 8 && map.width <= 32 && map.height >= 8 && map.height <= 32)) {
		throw new GameError("map width/height must be between 8 and 32");
	}
	const terrain = map.cells.flat();
	if (terrain.length !== map.width * map.height) {
		throw new GameError("terrain list length must equal width*height");
	}

	const spots = {};
	for (const s of init.spots || []) {
		spots[String(s.pos)] = { pos: s.pos, brand: s.brand, stocks: s.stocks };
	}

	const dayConfigs = init.daySteps.map((steps, i) => ({
		steps,
		response_time: init.daySeconds[i],
	}));

	const selectionLimit = init.agent_selection_time_limit ?? 60.0;
	const startTime = init.startsAt;
	const stopTime =
		startTime + selectionLimit + dayConfigs.reduce((sum, dc) => sum + dc.response_time, 0);

	const teams = {};
	for (const spec of init.teams) {
		const n = spec.agents.length;
		if (n < 3 || n > 8) {
			throw new GameError(
				`team '${spec.team_id}' has ${n} agents; must be between 3 and 8`,
			);
		}
		const teamId = String(spec.team_id);
		const stock = {};
		for (const key of Object.keys(spots)) stock[key] = spots[key].stocks;
		teams[teamId] = {
			team_id: teamId,
			init_agents: spec.agents.map((startCell, i) => ({
				agent_id: String(i),
				start_cell: startCell,
			})),
			max_fuel: init.fuelLimits,
			agents: [],
			types_selected: false,
			stock,
			collected_today: [],
			types_by_day: [],
			total_servings: 0,
			all_types: [],
			cumulative_response_time: 0.0,
			pending_actions: {},
			last_submit_elapsed: null,
		};
	}

	const game = {
		game_id: init.game_id,
		status: "selecting_agents",
		day: -1,
		map: {
			width: map.width,
			height: map.height,
			terrain,
			spots,
			congestion_threshold: init.busyThreshold,
			jam_threshold: init.jammedThreshold,
		},
		max_fuel: init.fuelLimits,
		day_configs: dayConfigs,
		agent_selection_time_limit: selectionLimit,
		start_time: startTime,
		stop_time: stopTime,
		selection_start_time: startTime,
		steps_today: 0,
		day_start_time: 0.0,
		road_condition: {},
		traffic_history: [],
		today_traffic: {},
		teams,
	};
	for (const c of roadCells(game.map)) {
		game.road_condition[String(c)] = SMOOTH;
		game.today_traffic[String(c)] = 0;
	}
	return game;
}

// --------------------------------------------------------------------------
// Agent type selection
// --------------------------------------------------------------------------

const checkWithinWindow = (game, nowSec) => {
	if (nowSec < game.start_time) {
		throw new GameError(
			`game has not started yet (starts at ${game.start_time}, now ${nowSec})`,
		);
	}
	if (nowSec > game.stop_time) {
		throw new GameError(`game has ended (stopped at ${game.stop_time}, now ${nowSec})`);
	}
};

export function selectAgentTypes(game, teamId, types, nowSec) {
	checkWithinWindow(game, nowSec);
	if (game.status !== "selecting_agents") {
		throw new GameError("agent type selection is closed for this game");
	}
	const team = getTeam(game, teamId);
	const n = team.init_agents.length;
	if (types.length !== n) {
		throw new GameError(`expected ${n} agent types, got ${types.length}`);
	}
	if (types.some((t) => t !== 0 && t !== 1)) {
		throw new GameError("agent types must each be 0 (patrol) or 1 (refuel)");
	}
	team.agents = types.map((t, i) => ({
		agent_id: String(i),
		type: t === 0 ? "patrol" : "refuel",
		cell: team.init_agents[i].start_cell,
		fuel: t === 0 ? game.max_fuel : 0,
		remaining_steps: 0,
		invalid_today: false,
		invalid_reason: "",
	}));
	team.types_selected = true;
	return { ok: true, team_id: teamId };
}

const defaultAgentTypes = (game, team) => {
	team.agents = team.init_agents.map((ia) => ({
		agent_id: ia.agent_id,
		type: "patrol",
		cell: ia.start_cell,
		fuel: game.max_fuel,
		remaining_steps: 0,
		invalid_today: false,
		invalid_reason: "",
	}));
	team.types_selected = true;
};

const beginGame = (game, atSec) => {
	for (const team of Object.values(game.teams)) {
		if (!team.types_selected) defaultAgentTypes(game, team);
	}
	game.day = 0;
	game.steps_today = dayConfig(game, 0).steps;
	game.road_condition = {};
	for (const c of roadCells(game.map)) game.road_condition[String(c)] = SMOOTH;
	game.day_start_time = atSec;
	game.status = "in_progress";
};

// --------------------------------------------------------------------------
// Day execution
// --------------------------------------------------------------------------

// One road-cell stay-step (traffic volume) for a cell an agent is settled on
// or arrived at during a step.
const recordStay = (game, cell) => {
	if (game.map.terrain[cell] === TERRAIN.ROAD) {
		const key = String(cell);
		game.today_traffic[key] = (game.today_traffic[key] || 0) + 1;
	}
};

const refuelCheck = (game, agents) => {
	const patrolByCell = new Map();
	const refuelCells = new Set();
	for (const ag of agents) {
		if (ag.type === "patrol") {
			if (!patrolByCell.has(ag.cell)) patrolByCell.set(ag.cell, []);
			patrolByCell.get(ag.cell).push(ag);
		} else {
			refuelCells.add(ag.cell);
		}
	}
	for (const [cell, patrols] of patrolByCell) {
		if (refuelCells.has(cell)) {
			for (const p of patrols) p.fuel = game.max_fuel;
		}
	}
};

// Collect udon for a patrol settled/arrived on a spot. Returns the collected
// cell, or null. Same-step contention is handled by the caller iterating
// agents in agent-index order (stock decrements as it goes → lower index wins).
const collectAt = (game, team, agent) => {
	const spot = game.map.spots[String(agent.cell)];
	if (!spot) return null;
	if (hasCollected(team, agent.agent_id, agent.cell)) return null;
	if ((team.stock[String(agent.cell)] || 0) <= 0) return null;
	team.stock[String(agent.cell)] -= 1;
	team.collected_today.push([agent.agent_id, agent.cell]);
	team.total_servings += 1;
	addUnique(team.all_types, spot.brand);
	addUnique(team.types_by_day[team.types_by_day.length - 1], spot.brand);
	return agent.cell;
};

// Expand one agent's parsed instruction list into a per-step event array of
// length exactly `steps`. Each event: {cell, transit, fuel}:
//   - WAIT n → n settled steps at the current cell (transit:false);
//   - MOVE → travelTime(departure) steps; the agent stays at the departure cell
//     while in transit (transit:true) and its position becomes the destination
//     only on the LAST of those steps; the patrol departure fuel cost is charged
//     on the FIRST step of the move.
// Throws GameError on off-map / pond / wrong total-step count (geometry checks
// that do not depend on fuel; fuel feasibility is decided in the lockstep pass).
const expandPlan = (game, agentId, agentType, startCell, instructions, steps) => {
	const events = [];
	let cell = startCell;
	for (const instr of instructions) {
		if (instr.kind === "wait") {
			for (let i = 0; i < instr.steps; i += 1) events.push({ cell, transit: false, fuel: 0 });
		} else {
			const target = neighbor(game.map, cell, instr.direction);
			if (target === null) throw new GameError(`agent ${agentId}: move off the map`);
			if (game.map.terrain[target] === TERRAIN.POND) {
				throw new GameError(`agent ${agentId}: move onto a pond`);
			}
			const t = travelTime(game, cell);
			const f = agentType === "patrol" ? fuelCost(game, cell) : 0;
			for (let i = 0; i < t; i += 1) {
				const last = i === t - 1;
				events.push({ cell: last ? target : cell, transit: !last, fuel: i === 0 ? f : 0 });
			}
			cell = target;
		}
	}
	if (events.length !== steps) {
		throw new GameError(
			`agent ${agentId}: plan uses ${events.length} steps, must use exactly ${steps}`,
		);
	}
	return events;
};

// Run ONE day for a set of agents in LOCKSTEP (docs "Step Processing Order"):
// each step applies, across all agents, fuel-consume → move → collect →
// refuel-check → traffic-stay. `agents` must be in agent-index order (so spot
// contention resolves lowest-index-first). Options:
//   collect(agent) → collectedCell|null  (patrol, non-transit steps only)
//   stay(cell)                            (every agent, every step)
//   recorder(step, agents, collectedCells) (per-step snapshot, for replay)
// Throws GameError("agent X: insufficient fuel") the first step a patrol cannot
// afford its move — this makes validation and execution agree and correctly
// credits fuel from a refuel car that co-located on an earlier step.
const runDayLockstep = (game, agents, eventsById, { collect, stay, recorder }) => {
	const steps = game.steps_today;
	for (let s = 0; s < steps; s += 1) {
		// (1) fuel consumption at this step's move departures (patrol only)
		for (const agent of agents) {
			const ev = eventsById[agent.agent_id][s];
			if (ev.fuel > 0 && agent.type === "patrol") {
				if (agent.fuel < ev.fuel) {
					throw new GameError(`agent ${agent.agent_id}: insufficient fuel`);
				}
				agent.fuel -= ev.fuel;
			}
		}
		// (2) movement applied
		for (const agent of agents) agent.cell = eventsById[agent.agent_id][s].cell;
		// (3) collection, iterating in agent-index order (same-step contention)
		const collectedThisStep = [];
		for (const agent of agents) {
			const ev = eventsById[agent.agent_id][s];
			if (agent.type === "patrol" && !ev.transit && collect) {
				const got = collect(agent);
				if (got !== null && got !== undefined) collectedThisStep.push(got);
			}
		}
		// (4) refuel check at contemporaneous positions
		refuelCheck(game, agents);
		// (5) traffic stay-step for each agent's post-move cell
		if (stay) for (const agent of agents) stay(agent.cell);
		if (recorder) recorder(s + 1, agents, collectedThisStep);
	}
};

// Advance the game by one resolved day, executing each team's accepted plan
// (or an all-wait day when a team never submitted) in lockstep.
// `recorder`, when given, is called per team per step for replay building:
// recorder(teamId, step, agents, collectedCells).
const goNextDay = (game, nextDayStartSec, recorder) => {
	for (const team of Object.values(game.teams)) {
		if (team.last_submit_elapsed !== null && team.last_submit_elapsed !== undefined) {
			// Response time is recorded to the nearest second (docs).
			team.cumulative_response_time += Math.round(team.last_submit_elapsed);
		}
		team.types_by_day.push([]);
		team.collected_today = [];
		for (const ag of team.agents) {
			ag.remaining_steps = 0;
			ag.invalid_today = false;
			ag.invalid_reason = "";
		}
	}

	game.today_traffic = {};
	for (const c of roadCells(game.map)) game.today_traffic[String(c)] = 0;

	const steps = game.steps_today;
	for (const team of Object.values(game.teams)) {
		// A team that never submitted waits in place all day (docs).
		const eventsById = {};
		for (const agent of team.agents) {
			const instructions = team.pending_actions[agent.agent_id] || [{ kind: "wait", steps }];
			eventsById[agent.agent_id] = expandPlan(
				game,
				agent.agent_id,
				agent.type,
				agent.cell,
				instructions,
				steps,
			);
		}
		runDayLockstep(game, team.agents, eventsById, {
			collect: (agent) => collectAt(game, team, agent),
			stay: (cell) => recordStay(game, cell),
			recorder: recorder ? (step, ags, got) => recorder(team.team_id, step, ags, got) : null,
		});
		team.pending_actions = {};
		team.last_submit_elapsed = null;
	}

	game.traffic_history.push({ ...game.today_traffic });

	game.day += 1;
	if (game.day >= game.day_configs.length) {
		game.status = "finished";
	} else {
		game.steps_today = dayConfig(game, game.day).steps;
		recomputeRoadConditions(game);
		for (const team of Object.values(game.teams)) {
			for (const [pos, spot] of Object.entries(game.map.spots)) {
				team.stock[pos] = spot.stocks;
			}
		}
		game.day_start_time = nextDayStartSec;
	}
};

const recomputeRoadConditions = (game) => {
	const nTeams = Math.max(1, Object.keys(game.teams).length);
	const d = game.day;
	const prev1 = d - 1 >= 0 ? game.traffic_history[d - 1] || {} : {};
	const prev2 = d - 2 >= 0 ? game.traffic_history[d - 2] || {} : {};
	const conditions = {};
	for (const cell of roadCells(game.map)) {
		const key = String(cell);
		const volume = ((prev1[key] || 0) + (prev2[key] || 0)) / nTeams;
		if (volume < game.map.congestion_threshold) conditions[key] = SMOOTH;
		else if (volume < game.map.jam_threshold) conditions[key] = CONGESTED;
		else conditions[key] = JAM;
	}
	game.road_condition = conditions;
};

// --------------------------------------------------------------------------
// Submission validation. Runs the SAME lockstep engine on copies, so a plan is
// accepted iff the executor can run it — including a move funded by a refuel
// car that co-locates on an earlier step (no validate/execute divergence).
// --------------------------------------------------------------------------

const parseAgentPlan = (plan) => {
	const instrs = [];
	for (const v of plan) {
		if (!Number.isInteger(v)) throw new GameError(`invalid action plan value ${v}`);
		if (v <= -1) instrs.push({ kind: "wait", direction: null, steps: -v });
		else if (v >= 0 && v <= 5) instrs.push({ kind: "move", direction: v, steps: null });
		else throw new GameError(`invalid action plan value ${v}`);
	}
	return instrs;
};

export function validateActions(game, teamId, day, plans, nowSec) {
	checkWithinWindow(game, nowSec);
	if (game.status !== "in_progress") {
		throw new GameError(`game is not in progress (status=${game.status})`);
	}
	if (day !== game.day) {
		throw new GameError(`day ${day} is not the current day (${game.day})`);
	}
	const team = getTeam(game, teamId);
	if (plans.length !== team.agents.length) {
		throw new GameError(`expected ${team.agents.length} agent plans, got ${plans.length}`);
	}

	const parsed = {};
	team.agents.forEach((agent, i) => {
		parsed[agent.agent_id] = parseAgentPlan(plans[i]);
	});

	// Geometry + exact-step count (expandPlan throws), then a fuel-feasibility
	// dry-run of the real lockstep engine on copies (no collect/stay/record).
	const copies = team.agents.map((a) => ({
		agent_id: a.agent_id,
		type: a.type,
		cell: a.cell,
		fuel: a.fuel,
	}));
	const eventsById = {};
	for (const a of copies) {
		eventsById[a.agent_id] = expandPlan(
			game,
			a.agent_id,
			a.type,
			a.cell,
			parsed[a.agent_id],
			game.steps_today,
		);
	}
	runDayLockstep(game, copies, eventsById, { collect: null, stay: null, recorder: null });
	return parsed;
}

// --------------------------------------------------------------------------
// Time-driven advancement
// --------------------------------------------------------------------------

const loadPendingActions = (game, submissions) => {
	for (const row of submissions || []) {
		const team = game.teams[String(row.team_id)];
		if (!team) continue;
		const pending = {};
		team.agents.forEach((agent, i) => {
			pending[agent.agent_id] = parseAgentPlan(row.actions[i] || []);
		});
		team.pending_actions = pending;
		// Clamp to the day's response window. In a seeded past game a human's
		// own submission stamps submitted_at = wall-clock now() against a
		// virtual day_start_time, which could otherwise inflate the response
		// time far beyond the day's seconds; the real server's adopted answer
		// is always within the window anyway.
		const window_ = dayConfig(game, game.day).response_time;
		const elapsed = row.submitted_at - game.day_start_time;
		team.last_submit_elapsed = Math.min(window_, Math.max(0.0, elapsed));
	}
};

export function catchUp(game, nowSec, ensureSubmissions, recorder) {
	let changed = false;
	for (;;) {
		if (game.status === "selecting_agents") {
			const selectionEnd = game.selection_start_time + game.agent_selection_time_limit;
			if (nowSec >= selectionEnd) {
				beginGame(game, selectionEnd);
				changed = true;
				continue;
			}
		} else if (game.status === "in_progress") {
			const deadline = game.day_start_time + dayConfig(game, game.day).response_time;
			if (nowSec >= deadline) {
				const submissions = ensureSubmissions
					? ensureSubmissions(game.day, game.day_start_time, deadline)
					: [];
				loadPendingActions(game, submissions);
				goNextDay(game, deadline, recorder);
				changed = true;
				continue;
			}
		}
		break;
	}
	if (game.status !== "finished" && nowSec >= game.stop_time) {
		game.status = "finished";
		changed = true;
	}
	return changed;
}

// --------------------------------------------------------------------------
// Views (exact FastAPI response bodies)
// --------------------------------------------------------------------------

export const isTeamInGame = (game, teamId) =>
	Object.prototype.hasOwnProperty.call(game.teams, String(teamId));

const dayDeadline = (game) => {
	if (game.status !== "in_progress") return null;
	return game.day_start_time + dayConfig(game, game.day).response_time;
};

export function configForTeam(game, teamId) {
	const team = getTeam(game, teamId);
	const cells = [];
	for (let r = 0; r < game.map.height; r += 1) {
		cells.push(game.map.terrain.slice(r * game.map.width, (r + 1) * game.map.width));
	}
	return {
		startsAt: game.start_time,
		daySeconds: game.day_configs.map((dc) => dc.response_time),
		daySteps: game.day_configs.map((dc) => dc.steps),
		map: { height: game.map.height, width: game.map.width, cells },
		spots: Object.values(game.map.spots).map((s) => ({
			pos: s.pos,
			brand: s.brand,
			stocks: s.stocks,
		})),
		agents: team.init_agents.map((ia) => ia.start_cell),
		fuelLimits: game.max_fuel,
		players: Object.keys(game.teams).length,
		busyThreshold: game.map.congestion_threshold,
		jammedThreshold: game.map.jam_threshold,
	};
}

const agentAsKindPosFuel = (a) => ({
	kind: a.type === "patrol" ? 0 : 1,
	pos: a.cell,
	fuel: a.fuel,
});

export function dayInfoForTeam(game, teamId) {
	const team = getTeam(game, teamId);
	return {
		endsAt: dayDeadline(game),
		day: game.day,
		agents: team.agents.map(agentAsKindPosFuel),
		others: Object.entries(game.teams)
			.filter(([id]) => id !== String(teamId))
			.map(([id, other]) => ({ id, agents: other.agents.map(agentAsKindPosFuel) })),
		traffics: roadCells(game.map).map((cell) => ({
			pos: cell,
			status: game.road_condition[String(cell)] ?? SMOOTH,
		})),
	};
}

export function stateView(game, nowSec) {
	const deadline = dayDeadline(game);
	return {
		status: game.status,
		day: game.day,
		steps_today: game.status === "in_progress" ? game.steps_today : null,
		day_deadline_in: deadline ? Math.max(0.0, deadline - nowSec) : null,
		road_condition: { ...game.road_condition },
		teams: Object.fromEntries(
			Object.entries(game.teams).map(([tid, team]) => [
				tid,
				{
					types_selected: team.types_selected,
					agents: team.agents.map((a) => ({
						agent_id: a.agent_id,
						type: a.type,
						cell: a.cell,
						fuel: a.type === "patrol" ? a.fuel : null,
					})),
					stock: { ...team.stock },
					total_servings: team.total_servings,
					distinct_types: [...team.all_types],
				},
			]),
		),
	};
}

export function finalResult(game) {
	const key = (tid) => {
		const team = game.teams[tid];
		return [
			team.all_types.length,
			team.types_by_day.reduce((sum, s) => sum + s.length, 0),
			team.total_servings,
			-team.cumulative_response_time,
		];
	};
	const ranking = Object.keys(game.teams).sort((a, b) => {
		const ka = key(a);
		const kb = key(b);
		for (let i = 0; i < ka.length; i += 1) {
			if (ka[i] !== kb[i]) return kb[i] - ka[i]; // descending
		}
		return 0;
	});
	return {
		ranking,
		detail: Object.fromEntries(
			Object.keys(game.teams).map((tid) => {
				const team = game.teams[tid];
				return [
					tid,
					{
						distinct_types: team.all_types.length,
						cumulative_daily_types: team.types_by_day.reduce((sum, s) => sum + s.length, 0),
						total_servings: team.total_servings,
						cumulative_response_time: team.cumulative_response_time,
					},
				];
			}),
		),
	};
}

// --------------------------------------------------------------------------
// Bot plan generation — always yields a plan that passes validateActions.
// --------------------------------------------------------------------------

export function generateValidPlan(game, teamId, rand) {
	const team = getTeam(game, teamId);
	const steps = game.steps_today;
	return team.agents.map((agent) => {
		const plan = [];
		let remaining = steps;
		let cell = agent.cell;
		let fuel = agent.fuel;
		// A few random valid moves, then wait out the remainder. Never assume
		// refuelling, so fuel only decreases -> always conservative-valid.
		let moveBudget = 4 + Math.floor(rand() * 8);
		while (moveBudget > 0 && remaining > 0) {
			const tTime = travelTime(game, cell);
			const tFuel = fuelCost(game, cell);
			if (tTime > remaining) break;
			if (agent.type === "patrol" && fuel < tFuel) break;
			const candidates = [];
			for (let dir = 0; dir < 6; dir += 1) {
				const target = neighbor(game.map, cell, dir);
				if (target !== null && game.map.terrain[target] !== TERRAIN.POND) {
					candidates.push({ dir, target });
				}
			}
			if (!candidates.length) break;
			// Prefer spot cells with remaining stock when patrol.
			let pool = candidates;
			if (agent.type === "patrol") {
				const juicy = candidates.filter(
					(c) => game.map.spots[String(c.target)] && (team.stock[String(c.target)] || 0) > 0,
				);
				if (juicy.length && rand() < 0.7) pool = juicy;
			}
			const pick = pool[Math.floor(rand() * pool.length)];
			plan.push(pick.dir);
			remaining -= tTime;
			if (agent.type === "patrol") fuel -= tFuel;
			cell = pick.target;
			moveBudget -= 1;
			// Occasionally idle a little between moves.
			if (remaining > 2 && rand() < 0.25) {
				const idle = 1 + Math.floor(rand() * 2);
				plan.push(-idle);
				remaining -= idle;
			}
		}
		if (remaining > 0) plan.push(-remaining);
		if (!plan.length) plan.push(-steps); // steps===0 cannot happen in practice
		return plan;
	});
}

// --------------------------------------------------------------------------
// Replay reconstruction — re-runs the whole game from init and captures true
// per-step, lockstep-synchronized frames via the executor's recorder.
// --------------------------------------------------------------------------

export function buildReplay(init, selections, submissions, uptoDay) {
	const game = createGame(init);
	for (const sel of [...(selections || [])].sort((a, b) => a.at - b.at)) {
		try {
			selectAgentTypes(game, String(sel.team_id), sel.types, sel.at);
		} catch {
			// ignore invalid seeded selections, same as the service would
		}
	}
	beginGame(game, game.selection_start_time + game.agent_selection_time_limit);

	const days = [];
	const totalDays = game.day_configs.length;
	const resolvable = Math.min(uptoDay, totalDays);
	const snapshot = (ags) => ags.map((a) => ({ cell: a.cell, fuel: a.fuel, type: a.type }));

	for (let d = 0; d < resolvable; d += 1) {
		const steps = game.steps_today;
		const roadConditionSnapshot = { ...game.road_condition };
		const subs = (submissions || []).filter((s) => s.day === d);
		loadPendingActions(game, subs);
		const submittedTeams = new Set(subs.map((s) => String(s.team_id)));

		const perTeam = {};
		for (const [tid, team] of Object.entries(game.teams)) {
			perTeam[tid] = {
				kinds: team.agents.map((a) => (a.type === "patrol" ? 0 : 1)),
				servings: 0,
				frames: [{ step: 0, agents: snapshot(team.agents), collected: [], servings: 0 }],
			};
		}

		goNextDay(
			game,
			game.day_start_time + dayConfig(game, d).response_time,
			(tid, step, ags, collected) => {
				const pt = perTeam[tid];
				pt.servings += collected.length;
				pt.frames.push({
					step,
					agents: snapshot(ags),
					collected: [...collected],
					servings: pt.servings,
				});
			},
		);

		const teams = Object.entries(perTeam).map(([tid, pt]) => ({
			team_id: tid,
			kinds: pt.kinds,
			servings: pt.servings,
			submitted: submittedTeams.has(tid),
			frames: pt.frames,
		}));

		days.push({ day: d, steps, road_condition: roadConditionSnapshot, teams });
	}

	return { days };
}
