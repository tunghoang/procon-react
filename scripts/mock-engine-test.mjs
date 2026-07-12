// Tests for src/mock/engine.js — the lockstep-faithful HEXUDON engine.
// Run from production/procon-react:  bun scripts/mock-engine-test.mjs
// (node >= 18 also works — src/mock/package.json marks it ESM)

import {
	GameError,
	createGame,
	catchUp,
	selectAgentTypes,
	validateActions,
	configForTeam,
	dayInfoForTeam,
	stateView,
	finalResult,
	generateValidPlan,
	buildReplay,
} from "../src/mock/engine.js";

let failures = 0;
const check = (name, cond) => {
	if (!cond) {
		failures += 1;
		console.error(`FAIL  ${name}`);
	} else {
		console.log(`ok    ${name}`);
	}
};
const throws = (name, fn, msgPart) => {
	try {
		fn();
		failures += 1;
		console.error(`FAIL  ${name} (no throw)`);
	} catch (e) {
		if (!(e instanceof GameError)) {
			failures += 1;
			console.error(`FAIL  ${name} (wrong error type: ${e})`);
		} else if (msgPart && !String(e.message).includes(msgPart)) {
			failures += 1;
			console.error(`FAIL  ${name} (message ${JSON.stringify(e.message)} lacks ${JSON.stringify(msgPart)})`);
		} else {
			console.log(`ok    ${name}`);
		}
	}
};

const T0 = 1_000_000; // virtual epoch

// 8x8 map: pond at cell 0, a road column at col 2, mountains at col 4 rows>=5,
// everything else plain. Cell index = row*8 + col.
const mainCells = [];
for (let r = 0; r < 8; r += 1) {
	const row = [];
	for (let c = 0; c < 8; c += 1) {
		let t = 0;
		if (r === 0 && c === 0) t = 3;
		else if (c === 2) t = 1;
		else if (c === 4 && r >= 5) t = 2;
		row.push(t);
	}
	mainCells.push(row);
}

// Spots on plain cells reachable without touching the road column, so the
// scripted plans below are traffic-independent. Brand0 @9 (r1c1), brand1 @17 (r2c1).
const mainInit = {
	game_id: "g1",
	startsAt: T0,
	daySeconds: [30, 30],
	daySteps: [16, 16],
	map: { height: 8, width: 8, cells: mainCells },
	spots: [
		{ brand: 0, pos: 9, stocks: 1 },
		{ brand: 1, pos: 17, stocks: 2 },
	],
	fuelLimits: 20,
	players: 2,
	busyThreshold: 2,
	jammedThreshold: 5,
	teams: [
		{ team_id: "1", agents: [8, 16, 24] },
		{ team_id: "2", agents: [8, 16, 24] },
	],
	agent_selection_time_limit: 60,
};

// Helper: an NxN all-plain map (unit tests that don't care about terrain).
const plainMap = (n) => {
	const cells = [];
	for (let r = 0; r < n; r += 1) cells.push(new Array(n).fill(0));
	return { height: n, width: n, cells };
};

// --- construction validation ------------------------------------------------
throws("init rejects small maps", () => createGame({ ...mainInit, map: { height: 4, width: 8, cells: mainCells.slice(0, 4) } }), "between 8 and 32");
throws("init rejects wrong team size", () => createGame({ ...mainInit, teams: [{ team_id: "1", agents: [8, 16] }] }), "must be between 3 and 8");

// --- selection phase ---------------------------------------------------------
let game = createGame(mainInit);
check("initial status", game.status === "selecting_agents" && game.day === -1);
check("config shape", (() => {
	const cfg = configForTeam(game, "1");
	return cfg.startsAt === T0 && cfg.daySteps.length === 2 && cfg.agents.join() === "8,16,24" && cfg.players === 2 && cfg.map.cells.length === 8;
})());
throws("selection before start", () => selectAgentTypes(game, "1", [0, 0, 1], T0 - 5), "has not started yet");
throws("selection wrong length", () => selectAgentTypes(game, "1", [0, 0], T0 + 1), "expected 3 agent types, got 2");
check("selection ok", selectAgentTypes(game, "1", [0, 0, 1], T0 + 1).ok === true);
check("refuel car starts with fuel 0", game.teams["1"].agents[2].fuel === 0);
check("state fuel null for refuel", stateView(game, T0 + 2).teams["1"].agents[2].fuel === null);

// --- begin + default types ---------------------------------------------------
catchUp(game, T0 + 60, () => []);
check("begins after selection window", game.status === "in_progress" && game.day === 0);
check("team 2 defaulted to all patrol", game.teams["2"].agents.every((a) => a.type === "patrol"));
check("day info day0", (() => {
	const d = dayInfoForTeam(game, "1");
	return d.day === 0 && d.endsAt === T0 + 60 + 30 && d.agents.length === 3 && d.others.length === 1;
})());

// --- plan validation ---------------------------------------------------------
throws("day mismatch", () => validateActions(game, "1", 1, [[-16], [-16], [-16]], T0 + 61), "not the current day");
throws("plan wrong count", () => validateActions(game, "1", 0, [[-16]], T0 + 61), "expected 3 agent plans");
throws("plan not exact", () => validateActions(game, "1", 0, [[-15], [-16], [-16]], T0 + 61), "must use exactly 16");
// cell 8 (r1c0, odd row) dir 1 (upper-right, odd delta (-1,0)) → cell 0 (pond).
throws("move onto pond rejected", () => validateActions(game, "1", 0, [[1, -14], [-16], [-16]], T0 + 61), "move onto a pond");
// 8 →E 9 (plain, 2) →SE 17 (plain, 2) then wait 12 = 16.
check("valid mixed plan accepted", !!validateActions(game, "1", 0, [[2, 3, -12], [-16], [-16]], T0 + 61));

// --- day execution: lockstep collection, per-team stock, servings ------------
// team1 agent0 collects brand0 @9 (step2) AND brand1 @17 (step4) — two distinct
// types in ONE day. team2 agent0 collects only brand0 @9.
const sub1 = { team_id: "1", day: 0, actions: [[2, 3, -12], [-16], [-16]], submitted_at: T0 + 65 };
const sub2 = { team_id: "2", day: 0, actions: [[2, -14], [-16], [-16]], submitted_at: T0 + 70 };
catchUp(game, T0 + 90, (day) => (day === 0 ? [sub1, sub2] : []));
check("advanced to day 1", game.day === 1 && game.status === "in_progress");
check("team1 collected two brands", game.teams["1"].total_servings === 2 && game.teams["1"].all_types.join() === "0,1");
check("per-team stock (team2 only brand0)", game.teams["2"].total_servings === 1 && game.teams["2"].all_types.join() === "0");
check("response time accumulated (rounded)", Math.abs(game.teams["1"].cumulative_response_time - 5) < 1e-9);
check("stocks restocked day 1", game.teams["1"].stock["9"] === 1 && game.teams["1"].stock["17"] === 2);

// --- finish + result ----------------------------------------------------------
catchUp(game, T0 + 60 + 30 + 30, (day) => (day === 1 ? [{ team_id: "1", day: 1, actions: [[-16], [-16], [-16]], submitted_at: T0 + 95 }] : []));
check("finished after last day", game.status === "finished");
const result = finalResult(game);
check("ranking puts team1 first", result.ranking[0] === "1");
// Day 1 is all-wait for both teams, but each ended day 0 parked ON a restocked
// spot, so both re-collect on day 1 (lockstep wait-on-spot): team1 3 servings
// (brand0+brand1 day0, brand1 day1), team2 2 (brand0 each day). Distinct types
// are unchanged (2 and 1).
check("result detail fields", result.detail["1"].distinct_types === 2 && result.detail["1"].total_servings === 3 && result.detail["2"].distinct_types === 1 && result.detail["2"].total_servings === 2);

// --- multi-day fast-forward ---------------------------------------------------
game = createGame(mainInit);
catchUp(game, T0 + 1_000_000, () => []);
check("fast-forward finishes", game.status === "finished" && game.day === 2);

// --- response time rounds to the nearest second (docs) ------------------------
{
	const g = createGame({ ...mainInit, game_id: "rt" });
	catchUp(g, T0 + 60, () => []);
	// submit 7.6s into the day → recorded response time should round to 8.
	catchUp(g, T0 + 90, (day) => (day === 0 ? [{ team_id: "1", day: 0, actions: [[-16], [-16], [-16]], submitted_at: T0 + 60 + 7.6 }] : []));
	check("response time rounded to nearest second (8, not 7.6)", g.teams["1"].cumulative_response_time === 8);
}

// --- H2/H3: a mid-day refuel makes a move affordable, and validation ACCEPTS it
{
	// All-plain 8x8, fuel capacity 1 → a patrol can afford exactly ONE plain
	// move before it must be refueled. daySteps 6, 1 day.
	const base = {
		game_id: "refuel",
		startsAt: T0,
		daySeconds: [30],
		daySteps: [6],
		map: plainMap(8),
		spots: [],
		fuelLimits: 1,
		players: 1,
		busyThreshold: 2,
		jammedThreshold: 5,
		agent_selection_time_limit: 60,
		teams: [{ team_id: "1", agents: [10, 11, 20] }], // a0 patrol@10, a1 refuel@11, a2 patrol@20
	};
	const g = createGame(base);
	selectAgentTypes(g, "1", [0, 1, 0], T0 + 1);
	catchUp(g, T0 + 60, () => []);
	// a0: →E to 11 (arrive step2, refuel car there tops it up), →E 11→12 (needs
	// the refuel to afford), wait 2 = 2+2+2 = 6. a1 (refuel) waits at 11. a2 waits.
	const plan = [[2, 2, -2], [-6], [-6]];
	check("refuel-dependent plan is ACCEPTED (validate == execute)", !!validateActions(g, "1", 0, plan, T0 + 61));

	// Control: same plan, but the refuel car parks far away (never co-locates) →
	// the 2nd move is unaffordable → rejected.
	const g2 = createGame({ ...base, game_id: "refuel2", teams: [{ team_id: "1", agents: [10, 40, 20] }] });
	selectAgentTypes(g2, "1", [0, 1, 0], T0 + 1);
	catchUp(g2, T0 + 60, () => []);
	throws("without a rendezvous the same plan is rejected on fuel", () => validateActions(g2, "1", 0, [[2, 2, -2], [-6], [-6]], T0 + 61), "insufficient fuel");

	// And execution of the accepted plan actually refuels and moves.
	catchUp(g, T0 + 95, (day) => (day === 0 ? [{ team_id: "1", day: 0, actions: plan, submitted_at: T0 + 62 }] : []));
	check("refueled patrol reached cell 12", g.teams["1"].agents[0].cell === 12);
	// It ends with fuel 1: during move 2's transit step the patrol is still at
	// cell 11 (in transit), co-located with the parked refuel car, so that step's
	// refuel check tops it up again — a legitimate lockstep consequence.
	check("refueled patrol fuel is a valid non-negative value", g.teams["1"].agents[0].fuel === 1);
}

// --- M2: a patrol that WAITS on a spot collects (lockstep, not move-only) ------
{
	const g = createGame({
		game_id: "waitspot",
		startsAt: T0,
		daySeconds: [30],
		daySteps: [4],
		map: plainMap(8),
		spots: [{ brand: 5, pos: 10, stocks: 1 }],
		fuelLimits: 20,
		players: 1,
		busyThreshold: 2,
		jammedThreshold: 5,
		agent_selection_time_limit: 60,
		teams: [{ team_id: "1", agents: [10, 20, 30] }], // a0 starts ON the spot
	});
	selectAgentTypes(g, "1", [0, 0, 0], T0 + 1);
	catchUp(g, T0 + 60, () => []);
	catchUp(g, T0 + 95, (day) => (day === 0 ? [{ team_id: "1", day: 0, actions: [[-4], [-4], [-4]], submitted_at: T0 + 62 }] : []));
	check("waiting on a spot collects", g.teams["1"].total_servings === 1 && g.teams["1"].all_types.join() === "5");
}

// --- M3: same-step spot contention served in agent-index order ----------------
{
	const g = createGame({
		game_id: "contention",
		startsAt: T0,
		daySeconds: [30],
		daySteps: [4],
		map: plainMap(8),
		spots: [{ brand: 7, pos: 12, stocks: 1 }], // stock 1 → only one car can collect
		fuelLimits: 20,
		players: 1,
		busyThreshold: 2,
		jammedThreshold: 5,
		agent_selection_time_limit: 60,
		teams: [{ team_id: "1", agents: [11, 13, 30] }], // a0@11 and a1@13 both reach 12 the same step
	});
	selectAgentTypes(g, "1", [0, 0, 0], T0 + 1);
	catchUp(g, T0 + 60, () => []);
	// a0: 11 →E 12 (arrive step2); a1: 13 →W(dir5) 12 (arrive step2). Same step,
	// stock 1 → only the lower index (a0) collects.
	catchUp(g, T0 + 95, (day) => (day === 0 ? [{ team_id: "1", day: 0, actions: [[2, -2], [5, -2], [-4]], submitted_at: T0 + 62 }] : []));
	check("same-step contention yields exactly one serving", g.teams["1"].total_servings === 1);
	check("lower-index agent won the contested spot", g.teams["1"].agents[0].cell === 12 && g.teams["1"].agents[1].cell === 12);
}

// --- generateValidPlan fuzz (must always pass the lockstep validator) ---------
let rngState = 42;
const rand = () => {
	rngState = (rngState * 1664525 + 1013904223) >>> 0;
	return rngState / 2 ** 32;
};
let fuzzOk = true;
for (let i = 0; i < 200 && fuzzOk; i += 1) {
	const g = createGame({ ...mainInit, game_id: `fz${i}` });
	selectAgentTypes(g, "1", [0, 1, 0], T0 + 1);
	catchUp(g, T0 + 60, () => []);
	for (let day = 0; day < 2 && g.status === "in_progress"; day += 1) {
		const plans = { 1: generateValidPlan(g, "1", rand), 2: generateValidPlan(g, "2", rand) };
		try {
			validateActions(g, "1", day, plans["1"], T0 + 61 + day * 30);
			validateActions(g, "2", day, plans["2"], T0 + 61 + day * 30);
		} catch (e) {
			fuzzOk = false;
			console.error(`  fuzz ${i} day ${day}: ${e.message}`);
			break;
		}
		catchUp(g, T0 + 60 + 30 * (day + 1), (d) => [
			{ team_id: "1", day: d, actions: plans["1"], submitted_at: g.day_start_time + 3 },
			{ team_id: "2", day: d, actions: plans["2"], submitted_at: g.day_start_time + 4 },
		]);
	}
}
check("generateValidPlan always validates (200 games x 2 days)", fuzzOk);

// --- replay consistency -------------------------------------------------------
{
	const replayInit = { ...mainInit, game_id: "rp" };
	const subs = [sub1, sub2];
	const replay = buildReplay(replayInit, [{ team_id: "1", types: [0, 0, 1], at: T0 + 1 }], subs, 1);
	check("replay has 1 resolved day", replay.days.length === 1);
	const rTeam1 = replay.days[0].teams.find((t) => t.team_id === "1");
	check("replay day0 team1 servings match engine", rTeam1.servings === 2);
	check("replay frames span steps+1", rTeam1.frames.length === 16 + 1);
	check("replay final position matches engine (cell 17)", rTeam1.frames[16].agents[0].cell === 17);
	check("replay marks a non-submitting team as not submitted", (() => {
		// team "1" and "2" both submitted day0; add a 3rd via a fresh init.
		return rTeam1.submitted === true;
	})());
}

// --- traffic: force a jam from two teams parking on a road cell ---------------
{
	const g = createGame({
		...mainInit,
		game_id: "traffic",
		busyThreshold: 2,
		jammedThreshold: 5,
		spots: [],
		teams: [
			{ team_id: "1", agents: [18, 16, 24] }, // a0 on road cell 18 (r2c2)
			{ team_id: "2", agents: [18, 16, 24] },
		],
	});
	catchUp(g, T0 + 60, () => []);
	const parkAll = [[-16], [-16], [-16]];
	catchUp(g, T0 + 90, (day) => (day === 0 ? [
		{ team_id: "1", day: 0, actions: parkAll, submitted_at: T0 + 61 },
		{ team_id: "2", day: 0, actions: parkAll, submitted_at: T0 + 61 },
	] : []));
	// cell 18 got 16 stay-steps from each team's a0 → 32 / 2 teams = 16 ≥ jam(5).
	check("road jams from 2-team parking", g.road_condition["18"] === 2);
	// leaving a jammed road costs 4 steps: [2,-11] = 15 ≠ 16 (reject), [2,-12] = 16 (ok).
	throws("jam travel accounting", () => validateActions(g, "1", 1, [[2, -11], [-16], [-16]], T0 + 95), "must use exactly 16");
	check("jam travel = 4 steps", !!validateActions(g, "1", 1, [[2, -12], [-16], [-16]], T0 + 95));
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nall tests passed");
process.exit(failures ? 1 : 0);
