/**
 * Group-stage scoring for the round standings page, as the organiser scores
 * the event (ported from production/scripts/standings.html):
 *
 *   match points = coefficient(match no) x rank point
 *   rank point   = scaleTop - position + 1   (1st takes scaleTop, then -1 per step)
 *   round total  = sum of match points, HIGHEST wins, standings split per group
 *
 * Groups and match numbers come from the QUESTION NAME, `<round>.<group>.<match>`
 * (`1.A.2` = round 1, group A, match 2). A question whose name does not follow
 * that shape falls back to its MATCH: the match name is the group and the
 * question's order within the match is the match number, so a group manager's
 * own questions still get a board without any naming discipline.
 *
 * Input is the team-manager's `/round/:id/hexudon-summary` response. Positions
 * are the backend's (numbered among the teams that actually competed, absentees
 * on the roster take the match's last position), not the engine's raw index.
 *
 * Pure: no React, no fetch, so it can be tested with plain node
 * (`node src/utils/group-standings.test.mjs`).
 */

export const NAME_RE = /^\s*(\d+)\s*\.\s*([A-Za-z]+)\s*\.\s*(\d+)\s*$/;

/** Coefficients the organiser's spreadsheet uses for matches 1..4. */
export const DEFAULT_COEFS = [1, 1.25, 1.5, 1.75];

export const DEFAULT_CONFIG = Object.freeze({
	mode: "coef", // "coef" (this module) | "positions" (the backend's sum of positions)
	coefs: DEFAULT_COEFS,
	scale: "fixed", // "fixed": 1st = largest group's size in the round | "group": that group's size
	dnp: "zero", // "zero": no day submitted scores 0 | "rank": still scores by position
});

/** Coefficient for match `n` (1-based); beyond the configured list keeps the +0.25 step. */
export const coefFor = (coefs, n) => {
	const raw = coefs?.[n - 1];
	// A cleared input stores "" and Number("") is 0 -- that must read as "not
	// set" (default), not as a x0 multiplier. An explicit 0 is honoured.
	if (raw === "" || raw === null || raw === undefined) return 1 + 0.25 * (n - 1);
	const v = Number(raw);
	if (Number.isFinite(v)) return v;
	return 1 + 0.25 * (n - 1);
};

/**
 * Tag every scored question with its group and match number.
 * @returns rows in input order, each `{...match, group, matchNo, fromName}`.
 */
export const classify = (matches) => {
	const out = matches.map((m) => {
		const parsed = NAME_RE.exec(m.question_name || "");
		if (parsed) {
			return {
				...m,
				group: parsed[2].toUpperCase(),
				matchNo: Number(parsed[3]),
				fromName: true,
			};
		}
		return {
			...m,
			group: m.match_name || `#${m.match_id}`,
			matchNo: null,
			fromName: false,
		};
	});
	// Fallback numbering: the unparsed questions of one match, by their stored
	// order then name, become match 1, 2, 3... of that match-named group.
	const byMatch = new Map();
	for (const row of out) {
		if (row.fromName) continue;
		const key = String(row.match_id);
		if (!byMatch.has(key)) byMatch.set(key, []);
		byMatch.get(key).push(row);
	}
	for (const rows of byMatch.values()) {
		rows.sort(
			(a, b) =>
				(a.question_order ?? 0) - (b.question_order ?? 0) ||
				String(a.question_name).localeCompare(String(b.question_name)),
		);
		rows.forEach((row, i) => {
			row.matchNo = i + 1;
		});
	}
	return out;
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param data   `{matches, teams}` from the hexudon-summary endpoint
 * @param config `{coefs, scale, dnp}` (see DEFAULT_CONFIG)
 * @returns {{groups: Array, matchNos: number[]}} groups sorted by name, each
 *   `{group, fromName, scaleTop, columns[], teams[]}`; a team is
 *   `{team_id, team_name, rank, total, played, missed, cells: {[question_id]: cell}}`
 *   and a cell `{position, rp, coef, pts, dnp}`.
 */
export const buildGroupStandings = (data, config = DEFAULT_CONFIG) => {
	const names = new Map(
		(data?.teams || []).map((t) => [String(t.team_id), t.team_name]),
	);
	const tagged = classify(data?.matches || []);

	const groups = new Map();
	for (const q of tagged) {
		if (!groups.has(q.group)) {
			groups.set(q.group, {
				group: q.group,
				fromName: q.fromName,
				questions: [],
				teamIds: new Set(),
			});
		}
		const g = groups.get(q.group);
		g.questions.push(q);
		for (const row of q.rows || []) g.teamIds.add(String(row.team_id));
	}

	// "fixed" hands every group the same ladder, sized by the largest group of
	// the round -- the spreadsheet's column is 4/3/2/1 for every group even
	// where one group has only 3 teams. "group" sizes each ladder to its group.
	let largest = 0;
	for (const g of groups.values()) largest = Math.max(largest, g.teamIds.size);

	const allMatchNos = new Set();
	const out = [];
	const sortedGroups = [...groups.values()].sort((a, b) =>
		a.group.localeCompare(b.group),
	);
	for (const g of sortedGroups) {
		const scaleTop = config.scale === "group" ? g.teamIds.size : largest;
		const columns = [...g.questions]
			.sort(
				(a, b) =>
					a.matchNo - b.matchNo ||
					String(a.question_name).localeCompare(String(b.question_name)),
			)
			.map((q) => ({
				question_id: q.question_id,
				question_name: q.question_name,
				match_name: q.match_name,
				matchNo: q.matchNo,
				coef: coefFor(config.coefs, q.matchNo),
			}));
		columns.forEach((c) => allMatchNos.add(c.matchNo));

		const teams = new Map();
		for (const id of g.teamIds) {
			teams.set(id, {
				team_id: id,
				team_name: names.get(id) || `#${id}`,
				total: 0,
				played: 0,
				missed: 0,
				cells: {},
			});
		}
		for (const q of g.questions) {
			const coef = coefFor(config.coefs, q.matchNo);
			for (const row of q.rows || []) {
				const t = teams.get(String(row.team_id));
				const dnp = !row.competed;
				const rp = Math.max(0, scaleTop - row.position + 1);
				const pts = dnp && config.dnp === "zero" ? 0 : round2(rp * coef);
				t.cells[q.question_id] = { position: row.position, rp, coef, pts, dnp };
				t.total = round2(t.total + pts);
				if (dnp) t.missed += 1;
				else t.played += 1;
			}
		}
		const list = [...teams.values()].sort(
			(a, b) =>
				b.total - a.total ||
				b.played - a.played ||
				a.team_name.localeCompare(b.team_name),
		);
		list.forEach((t, i) => {
			t.rank = i + 1;
		});
		out.push({ group: g.group, fromName: g.fromName, scaleTop, columns, teams: list });
	}
	return { groups: out, matchNos: [...allMatchNos].sort((a, b) => a - b) };
};

/** CSV of the grouped standings (with a BOM so Excel reads the Vietnamese). */
export const toCsv = (model, labels) => {
	const cell = (v) =>
		/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
	const lines = [];
	for (const g of model.groups) {
		lines.push(
			[
				labels.group,
				"#",
				labels.team,
				...g.columns.flatMap((c) => [
					`${c.question_name} ${labels.position}`,
					`${c.question_name} ${labels.points}`,
				]),
				labels.total,
			]
				.map(cell)
				.join(","),
		);
		for (const t of g.teams) {
			const row = [g.group, t.rank, t.team_name];
			for (const c of g.columns) {
				const x = t.cells[c.question_id];
				row.push(x ? (x.dnp ? labels.dnp : x.position) : "", x ? x.pts : "");
			}
			row.push(t.total);
			lines.push(row.map(cell).join(","));
		}
		lines.push("");
	}
	return "﻿" + lines.join("\n") + "\n";
};
