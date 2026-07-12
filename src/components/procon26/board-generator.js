// Client-side HEXUDON board generation. The checked-in game service has no
// GET /board endpoint, so the admin UI generates rule-valid boards locally
// and submits the full /game/init body as the question's raw_questions.
//
// Official constraints (docs/hexudon_EN.md + Competition/schema.pdf):
//   - width/height 8..32; terrain 0 plain / 1 road / 2 mountain / 3 pond
//   - at least one cell of each terrain; all non-pond cells mutually
//     reachable (hex adjacency, even rows shifted right)
//   - spots only on plain cells without agents, one per cell; spot count in
//     [agentsPerTeam, max(width, height)]; stocks in [1, agentsPerTeam];
//     every brand id 0..brandCount-1 used at least once
//   - agents 3..8 per team, on distinct plain cells without spots
//   - daySteps each within [(w+h), 4*(w+h)]; fuel within [1x, 3x] day-1 steps

import { neighborCell } from "./game-handler";

const mulberry32 = (seed) => {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const PLAIN = 0;
const ROAD = 1;
const MOUNTAIN = 2;
const POND = 3;

const nonPondConnected = (width, height, flat) => {
	const start = flat.findIndex((t) => t !== POND);
	if (start === -1) return false;
	const seen = new Set([start]);
	const queue = [start];
	while (queue.length) {
		const cell = queue.pop();
		for (let dir = 0; dir < 6; dir += 1) {
			const next = neighborCell(width, height, cell, dir);
			if (next !== null && flat[next] !== POND && !seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	return flat.every((t, i) => t === POND || seen.has(i));
};

const randomBlob = (width, height, flat, size, rand, allowed) => {
	// Grow a connected blob from a random seed cell over `allowed` cells.
	const candidates = [];
	flat.forEach((t, i) => {
		if (allowed(i)) candidates.push(i);
	});
	if (!candidates.length) return [];
	const blob = new Set([candidates[Math.floor(rand() * candidates.length)]]);
	let guard = size * 30;
	while (blob.size < size && guard-- > 0) {
		const from = [...blob][Math.floor(rand() * blob.size)];
		const dir = Math.floor(rand() * 6);
		const next = neighborCell(width, height, from, dir);
		if (next !== null && allowed(next) && !blob.has(next)) blob.add(next);
	}
	return [...blob];
};

/**
 * Generate a rule-valid board. Deterministic for a given `seed`.
 * Returns {map:{height,width,cells:int[][]}, spots:[{brand,pos,stocks}],
 * agentStartCells:int[]}.
 */
export const generateBoard = ({
	width,
	height,
	agentsPerTeam,
	spotCount,
	brandCount,
	seed = 1,
}) => {
	if (!(width >= 8 && width <= 32) || !(height >= 8 && height <= 32)) {
		throw new Error("width/height must be between 8 and 32");
	}
	if (!(agentsPerTeam >= 3 && agentsPerTeam <= 8)) {
		throw new Error("agents per team must be between 3 and 8");
	}
	const maxSpots = Math.max(width, height);
	if (!(spotCount >= agentsPerTeam && spotCount <= maxSpots)) {
		throw new Error(`spot count must be between ${agentsPerTeam} and ${maxSpots}`);
	}
	if (!(brandCount >= 1 && brandCount <= spotCount)) {
		throw new Error(`brand count must be between 1 and ${spotCount}`);
	}

	const rand = mulberry32(seed);
	const total = width * height;

	for (let attempt = 0; attempt < 60; attempt += 1) {
		const flat = new Array(total).fill(PLAIN);

		// Road network: a winding horizontal + vertical corridor.
		const roadRow = 1 + Math.floor(rand() * (height - 2));
		const roadCol = 1 + Math.floor(rand() * (width - 2));
		for (let c = 0; c < width; c += 1) flat[roadRow * width + c] = ROAD;
		for (let r = 0; r < height; r += 1) flat[r * width + roadCol] = ROAD;

		// Mountain cluster(s) ~8% of cells, pond blob(s) ~7%.
		const mountains = randomBlob(width, height, flat, Math.max(3, Math.round(total * 0.08)), rand, (i) => flat[i] === PLAIN);
		mountains.forEach((i) => {
			flat[i] = MOUNTAIN;
		});
		const ponds = randomBlob(width, height, flat, Math.max(3, Math.round(total * 0.07)), rand, (i) => flat[i] === PLAIN);
		ponds.forEach((i) => {
			flat[i] = POND;
		});

		if (!flat.includes(PLAIN) || !flat.includes(ROAD) || !flat.includes(MOUNTAIN) || !flat.includes(POND)) continue;
		if (!nonPondConnected(width, height, flat)) continue;

		// Agents + spots on distinct plain cells.
		const plainCells = [];
		flat.forEach((t, i) => {
			if (t === PLAIN) plainCells.push(i);
		});
		if (plainCells.length < agentsPerTeam + spotCount) continue;
		const shuffled = [...plainCells];
		for (let i = shuffled.length - 1; i > 0; i -= 1) {
			const j = Math.floor(rand() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		const agentStartCells = shuffled.slice(0, agentsPerTeam).sort((a, b) => a - b);
		const spotCells = shuffled.slice(agentsPerTeam, agentsPerTeam + spotCount);

		// Brands: each of 0..brandCount-1 at least once, remainder random.
		const brands = Array.from({ length: brandCount }, (_, i) => i);
		while (brands.length < spotCount) brands.push(Math.floor(rand() * brandCount));
		for (let i = brands.length - 1; i > 0; i -= 1) {
			const j = Math.floor(rand() * (i + 1));
			[brands[i], brands[j]] = [brands[j], brands[i]];
		}

		const spots = spotCells
			.map((pos, i) => ({
				brand: brands[i],
				pos,
				stocks: 1 + Math.floor(rand() * agentsPerTeam),
			}))
			.sort((a, b) => a.pos - b.pos);

		const cells = [];
		for (let r = 0; r < height; r += 1) cells.push(flat.slice(r * width, (r + 1) * width));

		return { map: { height, width, cells }, spots, agentStartCells };
	}
	throw new Error("could not generate a valid board — try another seed");
};

/**
 * Assemble the full /game/init body (minus game_id — the team manager injects
 * the question id) from a generated board and the match's team roster.
 */
export const assembleInit = ({
	board,
	teams,
	daySteps,
	daySeconds,
	startsAt,
	agentSelectionTimeLimit,
	busyThreshold,
	jammedThreshold,
	fuelLimits,
}) => {
	const { width, height } = board.map;
	const errors = [];
	if (!teams?.length) errors.push("the match has no teams — add teams first");
	if (!daySteps?.length || daySteps.length !== daySeconds?.length) {
		errors.push("daySteps and daySeconds must have the same (non-zero) length");
	}
	if (daySteps?.length < 4 || daySteps?.length > 10) {
		errors.push("the match must have 4-10 days");
	}
	const minSteps = width + height;
	const maxSteps = 4 * (width + height);
	(daySteps || []).forEach((s, i) => {
		if (!(s >= minSteps && s <= maxSteps)) {
			errors.push(`day ${i + 1} steps must be within ${minSteps}-${maxSteps}`);
		}
	});
	if (!(Number.isInteger(busyThreshold) && busyThreshold >= 1 && busyThreshold <= 5)) {
		errors.push("busyThreshold must be an integer 1-5");
	}
	if (
		!(Number.isInteger(jammedThreshold) && jammedThreshold >= 2 && jammedThreshold <= 10) ||
		jammedThreshold <= busyThreshold
	) {
		errors.push("jammedThreshold must be an integer 2-10 and greater than busyThreshold");
	}
	if (
		!Number.isInteger(fuelLimits) ||
		fuelLimits < (daySteps?.[0] ?? 1) ||
		fuelLimits > 3 * (daySteps?.[0] ?? 1)
	) {
		errors.push("fuelLimits must be an integer within [1x, 3x] of day-1 steps");
	}
	if (errors.length) {
		const error = new Error(errors.join("; "));
		error.details = errors;
		throw error;
	}
	return {
		startsAt,
		daySeconds: [...daySeconds],
		daySteps: [...daySteps],
		map: board.map,
		spots: board.spots,
		fuelLimits,
		players: teams.length,
		busyThreshold,
		jammedThreshold,
		teams: teams.map((t) => ({ team_id: String(t.id ?? t.team_id), agents: [...board.agentStartCells] })),
		agent_selection_time_limit: agentSelectionTimeLimit,
	};
};

/**
 * Structural check for a pasted /game/init body (the Manual tab). Returns a
 * list of human-readable problems; empty means it looks like a valid init.
 */
export const validateInitShape = (obj) => {
	const problems = [];
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
		return ["must be a JSON object shaped like the /game/init body"];
	}
	if (typeof obj.startsAt !== "number") problems.push("startsAt (epoch seconds) is required");
	if (!Array.isArray(obj.daySeconds) || !obj.daySeconds.length) problems.push("daySeconds must be a non-empty array");
	if (!Array.isArray(obj.daySteps) || !obj.daySteps.length) problems.push("daySteps must be a non-empty array");
	if (Array.isArray(obj.daySeconds) && Array.isArray(obj.daySteps) && obj.daySeconds.length !== obj.daySteps.length) {
		problems.push("daySeconds and daySteps must have the same length");
	}
	const map = obj.map;
	if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height) || !Array.isArray(map.cells)) {
		problems.push("map {width, height, cells} is required");
	} else {
		if (map.cells.length !== map.height || map.cells.some((row) => !Array.isArray(row) || row.length !== map.width)) {
			problems.push("map.cells must be height x width");
		}
		if (map.cells.flat?.().some((c) => ![0, 1, 2, 3].includes(c))) {
			problems.push("map cells must be 0-3");
		}
	}
	if (!Array.isArray(obj.spots)) problems.push("spots must be an array");

	// Day-structure bounds (docs): 4-10 days; steps/day in [(w+h), 4(w+h)].
	const w = map?.width;
	const h = map?.height;
	if (Array.isArray(obj.daySteps)) {
		if (obj.daySteps.length < 4 || obj.daySteps.length > 10) {
			problems.push("a match must have 4 to 10 days");
		}
		if (Number.isInteger(w) && Number.isInteger(h)) {
			const lo = w + h;
			const hi = 4 * (w + h);
			obj.daySteps.forEach((s, i) => {
				if (!(Number.isInteger(s) && s >= lo && s <= hi)) {
					problems.push(`day ${i + 1} steps must be within ${lo}..${hi}`);
				}
			});
		}
	}

	// Fuel capacity (docs E28/E29): >= 2 and within [1x, 3x] of day-1 steps.
	const day1 = Array.isArray(obj.daySteps) ? obj.daySteps[0] : undefined;
	if (!Number.isInteger(obj.fuelLimits) || obj.fuelLimits <= 0) {
		problems.push("fuelLimits must be a positive integer");
	} else if (Number.isInteger(day1)) {
		if (obj.fuelLimits < 2 || obj.fuelLimits < day1 || obj.fuelLimits > 3 * day1) {
			problems.push(`fuelLimits must be >= 2 and within [1x, 3x] of day-1 steps (${day1})`);
		}
	}

	// Thresholds (docs): busy 1-5, jammed 2-10 and greater than busy.
	if (!Number.isInteger(obj.busyThreshold) || obj.busyThreshold < 1 || obj.busyThreshold > 5) {
		problems.push("busyThreshold must be an integer 1..5");
	}
	if (
		!Number.isInteger(obj.jammedThreshold) ||
		obj.jammedThreshold < 2 ||
		obj.jammedThreshold > 10 ||
		obj.jammedThreshold <= obj.busyThreshold
	) {
		problems.push("jammedThreshold must be an integer 2..10 and greater than busyThreshold");
	}

	// Spot placement (docs): on Plain, one per cell, count in [agents, max(w,h)],
	// stock in [1, agents].
	const flat = Array.isArray(map?.cells) ? map.cells.flat() : null;
	const nAgents = Array.isArray(obj.teams?.[0]?.agents) ? obj.teams[0].agents.length : 0;
	if (Array.isArray(obj.spots) && flat) {
		const seen = new Set();
		for (const s of obj.spots) {
			if (!Number.isInteger(s?.pos) || s.pos < 0 || s.pos >= flat.length) {
				problems.push(`spot pos ${s?.pos} is out of range`);
				continue;
			}
			if (flat[s.pos] !== 0) problems.push(`spot at ${s.pos} must be on a Plain cell`);
			if (seen.has(s.pos)) problems.push(`duplicate spot at cell ${s.pos}`);
			seen.add(s.pos);
			if (nAgents && !(Number.isInteger(s.stocks) && s.stocks >= 1 && s.stocks <= nAgents)) {
				problems.push(`spot at ${s.pos} stock must be within 1..${nAgents}`);
			}
		}
		if (nAgents && (obj.spots.length < nAgents || obj.spots.length > Math.max(w, h))) {
			problems.push(`spot count must be within ${nAgents}..${Math.max(w, h)}`);
		}
	}

	// Teams + agent start cells (docs E27): 3-8 agents; distinct, on Plain,
	// spot-free; identical starting layout for every team.
	if (!Array.isArray(obj.teams) || !obj.teams.length) {
		problems.push("teams must be a non-empty array of {team_id, agents}");
	} else {
		const spotCells = new Set((obj.spots || []).map((s) => s.pos));
		const layout0 = Array.isArray(obj.teams[0]?.agents) ? obj.teams[0].agents.join(",") : null;
		obj.teams.forEach((t, i) => {
			if (!Array.isArray(t.agents) || t.agents.length < 3 || t.agents.length > 8) {
				problems.push(`teams[${i}].agents must list 3-8 start cells`);
				return;
			}
			if (new Set(t.agents).size !== t.agents.length) {
				problems.push(`teams[${i}] start cells must be distinct`);
			}
			if (flat) {
				for (const cell of t.agents) {
					if (!(Number.isInteger(cell) && cell >= 0 && cell < flat.length)) {
						problems.push(`teams[${i}] start cell ${cell} is out of range`);
					} else if (flat[cell] !== 0) {
						problems.push(`teams[${i}] start cell ${cell} must be on a Plain cell`);
					} else if (spotCells.has(cell)) {
						problems.push(`teams[${i}] start cell ${cell} must not hold a spot`);
					}
				}
			}
			if (layout0 !== null && t.agents.join(",") !== layout0) {
				problems.push(`teams[${i}] must have the same starting layout as team 0`);
			}
		});
	}

	return problems;
};
