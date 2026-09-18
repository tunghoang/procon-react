/**
 * Run with:  node src/utils/group-standings.test.mjs
 * Pins the organiser's group scoring against a hand-computed example.
 */
import assert from "node:assert";
import {
	buildGroupStandings,
	classify,
	coefFor,
	toCsv,
	DEFAULT_CONFIG,
} from "./group-standings.js";

const rows = (...pairs) =>
	pairs.map(([team_id, position, competed = true]) => ({ team_id, position, competed }));

const q = (question_id, question_name, match_id, match_name, r, extra = {}) => ({
	question_id,
	question_name,
	match_id,
	match_name,
	rows: r,
	...extra,
});

const data = {
	teams: [
		{ team_id: "1", team_name: "Alpha" },
		{ team_id: "2", team_name: "Beta" },
		{ team_id: "3", team_name: "Gamma" },
		{ team_id: "4", team_name: "Delta" },
		{ team_id: "5", team_name: "Eps" },
		{ team_id: "6", team_name: "Zeta" },
		{ team_id: "7", team_name: "Eta" },
	],
	matches: [
		// group A: 4 teams, two matches. Delta never submitted in match 1.
		q("qa1", "1.A.1", 10, "R1", rows(["1", 1], ["2", 2], ["3", 3], ["4", 4, false])),
		q("qa2", "1.a.2", 10, "R1", rows(["2", 1], ["1", 2], ["4", 3], ["3", 4])),
		// group B: 3 teams, one match
		q("qb1", "1.B.1", 10, "R1", rows(["5", 1], ["6", 2], ["7", 3])),
	],
};

// --- coefficients ------------------------------------------------------------
assert.strictEqual(coefFor([1, 1.25, 1.5, 1.75], 3), 1.5);
assert.strictEqual(coefFor([1, 1.25, 1.5, 1.75], 5), 2, "beyond the list keeps the +0.25 step");
assert.strictEqual(coefFor(["x"], 1), 1, "garbage -> 1");

// --- fixed scale, DNP = 0 (spreadsheet defaults) ---------------------------------
{
	const m = buildGroupStandings(data, DEFAULT_CONFIG);
	assert.deepStrictEqual(m.groups.map((g) => g.group), ["A", "B"]);
	assert.deepStrictEqual(m.matchNos, [1, 2]);
	const A = m.groups[0];
	assert.strictEqual(A.scaleTop, 4);
	assert.strictEqual(A.fromName, true);
	assert.deepStrictEqual(A.columns.map((c) => c.matchNo), [1, 2]);
	const by = Object.fromEntries(A.teams.map((t) => [t.team_name, t]));
	// Alpha: 1st x1 = 4, 2nd x1.25 = 3.75 -> 7.75 ; Beta: 3 + 5 = 8
	assert.strictEqual(by.Beta.total, 8);
	assert.strictEqual(by.Alpha.total, 7.75);
	assert.strictEqual(by.Gamma.total, 2 + 1.25);
	assert.strictEqual(by.Delta.total, 0 + 2.5, "DNP match scores 0");
	assert.strictEqual(by.Delta.cells.qa1.dnp, true);
	assert.strictEqual(by.Delta.missed, 1);
	assert.deepStrictEqual(
		A.teams.map((t) => `${t.rank}.${t.team_name}`),
		["1.Beta", "2.Alpha", "3.Gamma", "4.Delta"],
	);
	// group B uses the round-wide ladder of 4 under "fixed"
	const B = m.groups[1];
	assert.strictEqual(B.scaleTop, 4);
	assert.strictEqual(B.teams[0].total, 4);
	assert.strictEqual(B.teams[2].total, 2);
}

// --- per-group scale, DNP still ranked --------------------------------------------
{
	const m = buildGroupStandings(data, { ...DEFAULT_CONFIG, scale: "group", dnp: "rank" });
	const B = m.groups[1];
	assert.strictEqual(B.scaleTop, 3);
	assert.strictEqual(B.teams[0].total, 3);
	const A = m.groups[0];
	const delta = A.teams.find((t) => t.team_name === "Delta");
	assert.strictEqual(delta.cells.qa1.pts, 1, "last position still pays 1 under dnp=rank");
	assert.strictEqual(delta.total, 3.5);
}

// --- fallback: names without the tag are grouped by match, numbered by order ------
{
	const fb = {
		teams: data.teams,
		matches: [
			q("x2", "Board two", 20, "UET internal", rows(["1", 2], ["2", 1]), { question_order: 2 }),
			q("x1", "Board one", 20, "UET internal", rows(["1", 1], ["2", 2]), { question_order: 1 }),
			q("y", "2.C.1", 21, "Org", rows(["5", 1])),
		],
	};
	const tagged = classify(fb.matches);
	assert.deepStrictEqual(
		tagged.map((t) => [t.group, t.matchNo, t.fromName]),
		[
			["UET internal", 2, false],
			["UET internal", 1, false],
			["C", 1, true],
		],
	);
	const m = buildGroupStandings(fb, { ...DEFAULT_CONFIG, scale: "group" });
	const uet = m.groups.find((g) => g.group === "UET internal");
	assert.strictEqual(uet.fromName, false);
	assert.deepStrictEqual(uet.columns.map((c) => c.question_id), ["x1", "x2"]);
	assert.strictEqual(uet.columns[1].coef, 1.25);
	// Alpha 1st in x1 (2) + 2nd in x2 (1 x 1.25) = 3.25 ; Beta 1 + 2.5 = 3.5
	assert.deepStrictEqual(
		uet.teams.map((t) => [t.team_name, t.total]),
		[
			["Beta", 3.5],
			["Alpha", 3.25],
		],
	);
}

// --- unknown team id keeps a placeholder name; empty input is fine ----------------
{
	const m = buildGroupStandings({
		teams: [],
		matches: [q("q", "1.A.1", 1, "M", rows(["99", 1]))],
	});
	assert.strictEqual(m.groups[0].teams[0].team_name, "#99");
	assert.deepStrictEqual(buildGroupStandings({}).groups, []);
	assert.deepStrictEqual(buildGroupStandings(null).groups, []);
}

// --- CSV --------------------------------------------------------------------------
{
	const m = buildGroupStandings(data);
	const csv = toCsv(m, {
		group: "Group",
		team: "Team",
		position: "pos",
		points: "pts",
		total: "Total",
		dnp: "DNP",
	});
	assert.ok(csv.startsWith("﻿Group,#,Team,1.A.1 pos,1.A.1 pts,1.a.2 pos,1.a.2 pts,Total\n"));
	assert.ok(csv.includes("A,4,Delta,DNP,0,3,2.5,2.5\n"), csv);
}

console.log("group-standings: all assertions passed");
