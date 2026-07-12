// Seed data for the in-app mock. Times are RELATIVE to the seeding moment so
// the three demo games are always in three different phases:
//
//   Game A "starting soon"  — selection opens 45 s after seeding (300 s window)
//   Game B "live now"       — mid-match: day 3 of 4 in progress (75 s/day)
//   Game C "finished"       — played out 2 h in the past (bots played every team)
//
// Accounts: admin/uetbmm (hardcoded backdoor, not a db row), team01..team04
// with password "password". Teams 2-4 are bots (auto-select, auto-submit);
// in Game C team 1 is bot-driven too so the finished standings look real.

export const SEED_VERSION = "hexudon-mock-v2";

// ---------------------------------------------------------------------------
// The hand-crafted 10x10 board (rule-valid; verified by scripts and the
// engine's own validation):
//   . plain   R road (col 3 + row 6)   M mountain (2 clusters)   O pond blob
// Row-major cell ids, EVEN rows shifted right (hex layout).
// ---------------------------------------------------------------------------

const P = 0;
const R = 1;
const M = 2;
const O = 3;

const CELLS = [
	[P, P, P, R, P, P, P, P, P, P],
	[P, P, P, R, P, P, M, M, M, P],
	[P, P, P, R, P, P, M, M, M, P],
	[P, P, P, R, P, P, O, O, O, P],
	[P, P, P, R, P, P, O, O, O, P],
	[P, P, P, R, P, P, P, P, P, P],
	[R, R, R, R, R, R, R, R, R, R],
	[P, P, P, R, P, P, P, P, P, P],
	[P, P, P, R, P, P, P, P, P, P],
	[P, P, P, R, P, P, P, P, P, P],
];

const SPOTS = [
	{ brand: 0, pos: 1, stocks: 3 },
	{ brand: 1, pos: 8, stocks: 2 },
	{ brand: 2, pos: 21, stocks: 4 },
	{ brand: 3, pos: 34, stocks: 2 },
	{ brand: 0, pos: 55, stocks: 1 },
	{ brand: 1, pos: 72, stocks: 3 },
	{ brand: 2, pos: 86, stocks: 2 },
	{ brand: 3, pos: 99, stocks: 1 },
];

// 4 agents per team, identical layout for every team (per the rules): plain
// cells without spots.
const AGENT_STARTS = [40, 41, 50, 51];

const FUEL_LIMITS = 60; // within [1x, 3x] of every game's day-1 steps (30)

const TEAM_IDS = ["1", "2", "3", "4"];

const buildInit = ({ gameId, startsAt, daySeconds, daySteps, selectionLimit }) => ({
	game_id: gameId,
	startsAt,
	daySeconds,
	daySteps,
	map: { height: 10, width: 10, cells: CELLS.map((row) => [...row]) },
	spots: SPOTS.map((s) => ({ ...s })),
	fuelLimits: FUEL_LIMITS,
	players: TEAM_IDS.length,
	busyThreshold: 2,
	jammedThreshold: 5,
	teams: TEAM_IDS.map((id) => ({ team_id: id, agents: [...AGENT_STARTS] })),
	agent_selection_time_limit: selectionLimit,
});

// question_data mirrors what the admin dialog submits as raw_questions (the
// init body without game_id — the team manager injects the question id).
const questionData = (init) => {
	const { game_id, ...rest } = init;
	return JSON.stringify(rest);
};

export const buildSeed = (nowSec) => {
	const iso = (sec) => new Date(sec * 1000).toISOString();

	// Generous windows so a human can explore each phase; jump ahead any time
	// with __mock.advance(seconds).
	const gameA = buildInit({
		gameId: "q-hexudon-a",
		startsAt: nowSec + 60,
		daySeconds: [300, 300, 300, 300],
		daySteps: [30, 40, 40, 50],
		selectionLimit: 600,
	});
	// Live mid-match: selection over, day 1 (0-indexed) in progress with
	// ~2 minutes left, days keep flipping every 7 minutes.
	const gameB = buildInit({
		gameId: "q-hexudon-b",
		startsAt: nowSec - (60 + 420 + 300),
		daySeconds: [420, 420, 420, 420],
		daySteps: [30, 40, 40, 50],
		selectionLimit: 60,
	});
	const gameC = buildInit({
		gameId: "q-hexudon-c",
		startsAt: nowSec - 7200,
		daySeconds: [45, 45, 45, 45],
		daySteps: [30, 35, 40, 45],
		selectionLimit: 60,
	});

	const questions = [
		{
			id: gameA.game_id,
			name: "HEXUDON — Practice A (starting soon)",
			description: "Agent selection opens shortly after the page loads.",
			question_data: questionData(gameA),
			order: 1,
			match_id: 1,
			createdAt: iso(nowSec - 900),
			updatedAt: iso(nowSec - 900),
		},
		{
			id: gameB.game_id,
			name: "HEXUDON — Practice B (live)",
			description: "Mid-match: submit a plan for the current day.",
			question_data: questionData(gameB),
			order: 2,
			match_id: 1,
			createdAt: iso(nowSec - 900),
			updatedAt: iso(nowSec - 900),
		},
		{
			id: gameC.game_id,
			name: "HEXUDON — Practice C (finished)",
			description: "A completed match with final standings.",
			question_data: questionData(gameC),
			order: 3,
			match_id: 1,
			createdAt: iso(nowSec - 900),
			updatedAt: iso(nowSec - 900),
		},
	];

	// Scheduled bot agent-type picks (applied by the game mock once due).
	const botTypes = {
		2: [0, 0, 0, 1],
		3: [0, 0, 1, 1],
		4: [0, 1, 0, 0],
	};
	const selections = [];
	for (const game of [gameA, gameB, gameC]) {
		for (const teamId of ["2", "3", "4"]) {
			selections.push({
				game_id: game.game_id,
				team_id: teamId,
				types: [...botTypes[teamId]],
				at: game.startsAt + 5,
				applied: false,
			});
		}
	}
	// In the finished game, team 1 also played (as a bot) with a mixed fleet.
	selections.push({
		game_id: gameC.game_id,
		team_id: "1",
		types: [0, 0, 1, 0],
		at: gameC.startsAt + 5,
		applied: false,
	});

	return {
		seedVersion: SEED_VERSION,
		seededAt: nowSec,
		autoIds: { team: 4, tournament: 1, round: 1, match: 1, answer: 0 },
		teams: [
			{ id: 1, name: "UET Alpha", account: "team01", password: "password", is_admin: false, createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
			{ id: 2, name: "UET Bravo (bot)", account: "team02", password: "password", is_admin: false, createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
			{ id: 3, name: "UET Charlie (bot)", account: "team03", password: "password", is_admin: false, createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
			{ id: 4, name: "UET Delta (bot)", account: "team04", password: "password", is_admin: false, createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
		],
		tournaments: [
			{ id: 1, name: "NAPROCK 2026", description: "HEXUDON practice environment (mocked data)", createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
		],
		rounds: [
			{ id: 1, name: "Practice Round", description: "Warm-up round", tournament_id: 1, createdAt: iso(nowSec - 86400), updatedAt: iso(nowSec - 86400) },
		],
		matches: [
			{
				id: 1,
				name: "Practice Match 1",
				description: "All teams, three demo games",
				start_time: iso(nowSec - 3600 * 3),
				end_time: iso(nowSec + 86400 * 30),
				is_active: true,
				round_id: 1,
				createdAt: iso(nowSec - 86400),
				updatedAt: iso(nowSec - 86400),
			},
		],
		teamMatch: [1, 2, 3, 4].map((teamId) => ({ match_id: 1, team_id: teamId })),
		questions,
		games: {
			[gameA.game_id]: { init: gameA, state: null, botTeamIds: ["2", "3", "4"] },
			[gameB.game_id]: { init: gameB, state: null, botTeamIds: ["2", "3", "4"] },
			[gameC.game_id]: { init: gameC, state: null, botTeamIds: ["1", "2", "3", "4"] },
		},
		selections,
		submissions: [],
		answers: [],
	};
};
