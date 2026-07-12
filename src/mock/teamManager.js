// In-app mock of the team manager (Node/Express,
// production/procon-team-manager). Mirrors the real routes' auth, status
// codes, envelopes and quirks:
//   - Authorization header carries the BARE JWT (no "Bearer" prefix)
//   - admin/uetbmm backdoor -> {id:0, token} (payload {id:0,name,is_admin})
//   - requireAdmin failures -> 405 {"message":"Required admin"}
//   - non-admin tournament/round lists -> {data, message:"Success"} (no count)
//   - question_data stored as a JSON string; question create registers the
//     game on the (mock) game service and rolls back on failure
//   - DELETE /api/question/:id reproduces the real backend's ReferenceError
//     500 ("question_id is not defined") — bulk-delete is the working path

import { makeAdapter, HttpError, created } from "./http";
import { withDb, nextId, uuid } from "./db";
import { signToken, decodeToken } from "./jwt";
import { now } from "./clock";
import { registerGame, removeGame } from "./gameServiceMock";

// --------------------------------------------------------------------------
// Auth middleware (src/middleware/authenticate.js)
// --------------------------------------------------------------------------

const authenticate = (db, { body, query, headers }) => {
	const token =
		(body && body.token) ||
		query.token ||
		(headers.get ? headers.get("Authorization") : headers.Authorization);
	const payload = token ? decodeToken(token) : null;
	if (!payload) throw new HttpError(401, { message: "Unauthorized" });
	if (payload.id === 0 && payload.is_admin) return payload;
	const team = db.teams.find((t) => t.id === Number(payload.id));
	if (!team) throw new HttpError(401, { message: "Unauthorized" });
	return payload;
};

const requireAdmin = (auth) => {
	if (!auth.is_admin) throw new HttpError(405, { message: "Required admin" });
};

// --------------------------------------------------------------------------
// getFilter clone (lib/common.js): maps query keys to row predicates.
// Supported ops: eq, like (substring, case-insensitive), gt, lt.
// Bracketed keys ("match[eq_round_id]") arrive flat from axios params.
// --------------------------------------------------------------------------

const applyOp = (rowValue, op, filterValue) => {
	if (op === "eq") return String(rowValue) === String(filterValue);
	if (op === "like") {
		return String(rowValue ?? "").toLowerCase().includes(String(filterValue).toLowerCase());
	}
	if (op === "gt") return String(rowValue) > String(filterValue);
	if (op === "lt") return String(rowValue) < String(filterValue);
	return true;
};

// filterField: { queryKey: {field, op} } where field may be a resolver fn.
const buildPredicate = (query, filterField, prefix = "") => {
	const predicates = [];
	for (const [key, spec] of Object.entries(filterField)) {
		if (spec.field) {
			const raw = query[prefix ? `${prefix}[${key}]` : key];
			if (raw === undefined || raw === "") continue;
			predicates.push((row, ctx) => {
				const value =
					typeof spec.field === "function" ? spec.field(row, ctx) : row[spec.field];
				return applyOp(value, spec.op, raw);
			});
		} else {
			// nested group, e.g. teams[eq_id] / match[eq_round_id]
			predicates.push(...buildPredicate(query, spec, key));
		}
	}
	return predicates;
};

const filterRows = (rows, query, filterField, ctxFor) =>
	rows.filter((row) => {
		const ctx = ctxFor ? ctxFor(row) : {};
		return buildPredicate(query, filterField).every((p) => p(row, ctx));
	});

// --------------------------------------------------------------------------
// Serialization helpers (Sequelize include shapes)
// --------------------------------------------------------------------------

const teamPublic = (t) => {
	const { password, ...rest } = t;
	return rest;
};

const teamWithMatches = (db, team, roundId) => ({
	...teamPublic(team),
	Matches: db.teamMatch
		.filter((tm) => tm.team_id === team.id)
		.map((tm) => db.matches.find((m) => m.id === tm.match_id))
		.filter(Boolean)
		.filter((m) => (roundId ? String(m.round_id) === String(roundId) : true))
		.map((m) => ({ id: m.id, name: m.name })),
});

const matchWithIncludes = (db, match) => {
	const round = db.rounds.find((r) => r.id === match.round_id) || null;
	const tournament = round
		? db.tournaments.find((t) => t.id === round.tournament_id) || null
		: null;
	return {
		...match,
		teams: db.teamMatch
			.filter((tm) => tm.match_id === match.id)
			.map((tm) => db.teams.find((t) => t.id === tm.team_id))
			.filter(Boolean)
			.map((t) => ({ id: t.id, name: t.name })),
		round: round ? { ...round, tournament } : null,
	};
};

const questionPublic = (db, q) => {
	const { start_time, end_time, ...rest } = q;
	const match = db.matches.find((m) => m.id === q.match_id) || null;
	return { ...rest, match: match ? { ...match } : null };
};

const teamInMatch = (db, teamId, matchId) =>
	db.teamMatch.some((tm) => tm.team_id === Number(teamId) && tm.match_id === Number(matchId));

const matchesOfTeam = (db, teamId) =>
	db.teamMatch.filter((tm) => tm.team_id === Number(teamId)).map((tm) => tm.match_id);

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------

const routes = [
	// ---- auth ---------------------------------------------------------------
	{
		method: "POST",
		path: "/api/team/signin",
		handler: ({ body }) =>
			withDb((db) => {
				const { account, password } = body || {};
				if (account === "admin" && password === "uetbmm") {
					return { id: 0, token: signToken({ id: 0, name: "admin", is_admin: true }) };
				}
				const team = db.teams.find((t) => t.account === account);
				if (!team) throw new HttpError(404, { message: "Account not found" });
				if (team.password !== password) {
					throw new HttpError(400, { message: "Account or password error" });
				}
				const iat = Math.floor(now());
				return {
					id: team.id,
					is_admin: team.is_admin,
					token: signToken({
						id: team.id,
						name: team.name,
						is_admin: team.is_admin,
						iat,
						exp: iat + 2 * 86400,
					}),
				};
			}),
	},

	// ---- team ---------------------------------------------------------------
	{
		method: "GET",
		path: "/api/team",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const query = { ...req.query };
				if (!auth.is_admin) query.eq_id = auth.id;
				const filtered = filterRows(db.teams, query, {
					match_id: { field: "id", op: "like" },
					eq_id: { field: "id", op: "eq" },
					match_name: { field: "name", op: "like" },
					match_account: { field: "account", op: "like" },
					match_is_admin: { field: "is_admin", op: "like" },
				});
				return {
					count: filtered.length,
					data: filtered.map((t) => teamWithMatches(db, t, query.round_id)),
				};
			}),
	},
	{
		method: "PUT",
		path: "/api/team/password",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const team = db.teams.find((t) => t.id === Number(auth.id));
				if (!team) throw new HttpError(404, { message: "Team not found" });
				if (!req.body?.password) throw new HttpError(406, { message: "password invalid" });
				team.password = req.body.password;
				team.updatedAt = new Date(now() * 1000).toISOString();
				return { id: team.id };
			}),
	},
	{
		method: "GET",
		path: "/api/team/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				// Real quirk: ONLY the caller's own id is allowed (even admins).
				if (String(req.params.id) !== String(auth.id)) {
					throw new HttpError(405, { message: "Not allowed" });
				}
				const team = db.teams.find((t) => t.id === Number(req.params.id));
				if (!team) throw new HttpError(404, { message: "Team not found" });
				return teamWithMatches(db, team);
			}),
	},
	{
		method: "POST",
		path: "/api/team",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { name, account, password } = req.body || {};
				if (db.teams.some((t) => t.account === account || t.name === name)) {
					throw new HttpError(400, { message: "Account has already existed" });
				}
				const id = nextId(db, "team");
				const iso = new Date(now() * 1000).toISOString();
				db.teams.push({
					id,
					name,
					account,
					password,
					is_admin: !!req.body.is_admin,
					createdAt: iso,
					updatedAt: iso,
				});
				return created({ id });
			}),
	},
	{
		method: "PUT",
		path: "/api/team/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const team = db.teams.find((t) => t.id === Number(req.params.id));
				if (!team) throw new HttpError(404, { message: "Not found" });
				const { id, token, ...fields } = req.body || {};
				Object.assign(team, fields);
				team.updatedAt = new Date(now() * 1000).toISOString();
				return { id: team.id };
			}),
	},
	{
		method: "DELETE",
		path: "/api/team/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const index = db.teams.findIndex((t) => t.id === Number(req.params.id));
				if (index === -1) throw new HttpError(404, { message: "Not found" });
				db.teams.splice(index, 1);
				db.teamMatch = db.teamMatch.filter((tm) => tm.team_id !== Number(req.params.id));
				return { id: Number(req.params.id) };
			}),
	},

	// ---- tournament -----------------------------------------------------------
	{
		method: "GET",
		path: "/api/tournament",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				if (auth.is_admin) {
					return { count: db.tournaments.length, data: db.tournaments.map((t) => ({ ...t })) };
				}
				const matchIds = matchesOfTeam(db, auth.id);
				const roundIds = db.matches
					.filter((m) => matchIds.includes(m.id))
					.map((m) => m.round_id);
				const tournamentIds = new Set(
					db.rounds.filter((r) => roundIds.includes(r.id)).map((r) => r.tournament_id),
				);
				return {
					data: db.tournaments.filter((t) => tournamentIds.has(t.id)).map((t) => ({ ...t })),
					message: "Success",
				};
			}),
	},
	{
		method: "GET",
		path: "/api/tournament/:id",
		handler: (req) =>
			withDb((db) => {
				authenticate(db, req);
				const row = db.tournaments.find((t) => t.id === Number(req.params.id));
				if (!row) throw new HttpError(404, { message: "Tournament not found" });
				return { ...row };
			}),
	},
	{
		method: "POST",
		path: "/api/tournament",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				if (db.tournaments.some((t) => t.name === req.body?.name)) {
					throw new HttpError(400, { message: "Duplicated name" });
				}
				const id = nextId(db, "tournament");
				const iso = new Date(now() * 1000).toISOString();
				db.tournaments.push({
					id,
					name: req.body.name,
					description: req.body.description ?? null,
					createdAt: iso,
					updatedAt: iso,
				});
				return created({ id });
			}),
	},
	{
		method: "PUT",
		path: "/api/tournament/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.tournaments.find((t) => t.id === Number(req.params.id));
				if (!row) throw new HttpError(404, { message: "Not found" });
				const { id, token, ...fields } = req.body || {};
				Object.assign(row, fields, { updatedAt: new Date(now() * 1000).toISOString() });
				return { id: row.id };
			}),
	},
	{
		method: "DELETE",
		path: "/api/tournament/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const index = db.tournaments.findIndex((t) => t.id === Number(req.params.id));
				if (index === -1) throw new HttpError(404, { message: "Not found" });
				db.tournaments.splice(index, 1);
				return { id: Number(req.params.id) };
			}),
	},

	// ---- round -----------------------------------------------------------------
	{
		method: "GET",
		path: "/api/round",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const filterField = {
					match_id: { field: "id", op: "like" },
					eq_tournament_id: { field: "tournament_id", op: "eq" },
				};
				if (auth.is_admin) {
					const rows = filterRows(db.rounds, req.query, filterField);
					return { count: rows.length, data: rows.map((r) => ({ ...r })) };
				}
				const matchIds = matchesOfTeam(db, auth.id);
				const roundIds = new Set(
					db.matches.filter((m) => matchIds.includes(m.id)).map((m) => m.round_id),
				);
				const rows = filterRows(
					db.rounds.filter((r) => roundIds.has(r.id)),
					req.query,
					filterField,
				);
				return { data: rows.map((r) => ({ ...r })), message: "Success" };
			}),
	},
	{
		method: "GET",
		path: "/api/round/:id",
		handler: (req) =>
			withDb((db) => {
				authenticate(db, req);
				const row = db.rounds.find((r) => r.id === Number(req.params.id));
				if (!row) throw new HttpError(404, { message: "Round not found" });
				return { ...row };
			}),
	},
	{
		method: "POST",
		path: "/api/round",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { name, tournament_id } = req.body || {};
				if (db.rounds.some((r) => r.name === name && r.tournament_id === Number(tournament_id))) {
					throw new HttpError(400, { message: "Duplicated name" });
				}
				const id = nextId(db, "round");
				const iso = new Date(now() * 1000).toISOString();
				db.rounds.push({
					id,
					name,
					description: req.body.description ?? null,
					tournament_id: Number(tournament_id),
					createdAt: iso,
					updatedAt: iso,
				});
				return created({ id });
			}),
	},
	{
		method: "PUT",
		path: "/api/round/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.rounds.find((r) => r.id === Number(req.params.id));
				if (!row) throw new HttpError(404, { message: "Not found" });
				const { id, token, ...fields } = req.body || {};
				Object.assign(row, fields, { updatedAt: new Date(now() * 1000).toISOString() });
				return { id: row.id };
			}),
	},
	{
		method: "DELETE",
		path: "/api/round/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const index = db.rounds.findIndex((r) => r.id === Number(req.params.id));
				if (index === -1) throw new HttpError(404, { message: "Not found" });
				db.rounds.splice(index, 1);
				return { id: Number(req.params.id) };
			}),
	},

	// ---- match -------------------------------------------------------------------
	{
		method: "POST",
		path: "/api/match/bulk-add-teams",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { match_ids, team_ids } = req.body || {};
				if (!match_ids?.length || !team_ids?.length) {
					throw new HttpError(400, { message: "match_ids and team_ids are required" });
				}
				const matches = db.matches.filter((m) => match_ids.map(Number).includes(m.id));
				const teams = db.teams.filter((t) => team_ids.map(Number).includes(t.id));
				if (!matches.length) throw new HttpError(404, { message: "No matches found" });
				if (!teams.length) throw new HttpError(404, { message: "No teams found" });
				let addedCount = 0;
				for (const match of matches) {
					for (const team of teams) {
						if (!teamInMatch(db, team.id, match.id)) {
							db.teamMatch.push({ match_id: match.id, team_id: team.id });
							addedCount += 1;
						}
					}
				}
				return {
					message: `Successfully added ${addedCount} team-match relationships`,
					added_count: addedCount,
				};
			}),
	},
	{
		method: "POST",
		path: "/api/match/bulk-remove-teams",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { match_ids, team_ids } = req.body || {};
				if (!match_ids?.length || !team_ids?.length) {
					throw new HttpError(400, { message: "match_ids and team_ids are required" });
				}
				const matches = db.matches.filter((m) => match_ids.map(Number).includes(m.id));
				const teams = db.teams.filter((t) => team_ids.map(Number).includes(t.id));
				if (!matches.length) throw new HttpError(404, { message: "No matches found" });
				if (!teams.length) throw new HttpError(404, { message: "No teams found" });
				db.teamMatch = db.teamMatch.filter(
					(tm) =>
						!(
							matches.some((m) => m.id === tm.match_id) &&
							teams.some((t) => t.id === tm.team_id)
						),
				);
				// Real quirk: reported count = matches x teams, not actual removals.
				const removedCount = matches.length * teams.length;
				return {
					message: `Successfully removed ${removedCount} team-match relationships`,
					removed_count: removedCount,
				};
			}),
	},
	{
		method: "GET",
		path: "/api/match/name/:name",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const row = db.matches.find(
					(m) =>
						m.name === req.params.name && (auth.is_admin || m.is_active === true),
				);
				if (!row) throw new HttpError(404, { message: "Match not found" });
				return { ...row };
			}),
	},
	{
		method: "GET",
		path: "/api/match",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const query = { ...req.query };
				if (!auth.is_admin) {
					query["teams[eq_id]"] = auth.id;
					query.match_is_active = true;
				}
				const filterField = {
					match_id: { field: "id", op: "like" },
					match_is_active: { field: "is_active", op: "eq" },
					eq_round_tournament_id: {
						field: (m, ctx) => ctx.round?.tournament_id,
						op: "eq",
					},
					eq_round_id: { field: "round_id", op: "eq" },
					eq_tournament_id: {
						field: (m, ctx) => ctx.round?.tournament_id,
						op: "eq",
					},
					teams: {
						eq_id: {
							field: (m, ctx) => ctx.teamIds.find((id) => String(id) === String(query["teams[eq_id]"])),
							op: "eq",
						},
					},
				};
				const rows = filterRows(db.matches, query, filterField, (m) => ({
					round: db.rounds.find((r) => r.id === m.round_id),
					teamIds: db.teamMatch.filter((tm) => tm.match_id === m.id).map((tm) => tm.team_id),
				}));
				return { count: rows.length, data: rows.map((m) => matchWithIncludes(db, m)) };
			}),
	},
	{
		method: "GET",
		path: "/api/match/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const row = db.matches.find(
					(m) => m.id === Number(req.params.id) && (auth.is_admin || m.is_active === true),
				);
				if (!row) throw new HttpError(404, { message: "Match not found" });
				if (!auth.is_admin && !teamInMatch(db, auth.id, row.id)) {
					throw new HttpError(405, { message: "Not allowed" });
				}
				return matchWithIncludes(db, row);
			}),
	},
	{
		method: "POST",
		path: "/api/match",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { name, round_id } = req.body || {};
				if (db.matches.some((m) => m.name === name && m.round_id === Number(round_id))) {
					throw new HttpError(400, { message: "Duplicated name" });
				}
				const id = nextId(db, "match");
				const iso = new Date(now() * 1000).toISOString();
				db.matches.push({
					id,
					name,
					description: req.body.description ?? null,
					start_time: req.body.start_time ?? iso,
					end_time: req.body.end_time ?? iso,
					is_active: req.body.is_active ?? false,
					round_id: Number(round_id),
					createdAt: iso,
					updatedAt: iso,
				});
				return created({ id });
			}),
	},
	{
		method: "PUT",
		path: "/api/match/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.matches.find((m) => m.id === Number(req.params.id));
				if (!row) throw new HttpError(404, { message: "Not found" });
				const { id, token, teams, round, ...fields } = req.body || {};
				Object.assign(row, fields, { updatedAt: new Date(now() * 1000).toISOString() });
				return { id: row.id };
			}),
	},
	{
		method: "DELETE",
		path: "/api/match/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const index = db.matches.findIndex((m) => m.id === Number(req.params.id));
				if (index === -1) throw new HttpError(404, { message: "Not found" });
				const matchId = db.matches[index].id;
				db.matches.splice(index, 1);
				db.teamMatch = db.teamMatch.filter((tm) => tm.match_id !== matchId);
				return { id: matchId };
			}),
	},
	{
		method: "POST",
		path: "/api/match/:matchId/team/:teamId",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const match = db.matches.find((m) => m.id === Number(req.params.matchId));
				if (!match) throw new HttpError(404, { message: "Match not found" });
				const team = db.teams.find((t) => t.id === Number(req.params.teamId));
				if (!team) throw new HttpError(404, { message: "Team not found" });
				if (!teamInMatch(db, team.id, match.id)) {
					db.teamMatch.push({ match_id: match.id, team_id: team.id });
				}
				return { match_id: req.params.matchId, team_id: req.params.teamId };
			}),
	},
	{
		method: "DELETE",
		path: "/api/match/:matchId/team/:teamId",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const match = db.matches.find((m) => m.id === Number(req.params.matchId));
				if (!match) throw new HttpError(404, { message: "Match not found" });
				const team = db.teams.find((t) => t.id === Number(req.params.teamId));
				if (!team) throw new HttpError(404, { message: "Team not found" });
				db.teamMatch = db.teamMatch.filter(
					(tm) => !(tm.match_id === match.id && tm.team_id === team.id),
				);
				return { match_id: req.params.matchId, team_id: req.params.teamId };
			}),
	},

	// ---- question --------------------------------------------------------------
	{
		method: "GET",
		path: "/api/question/time",
		handler: (req) =>
			withDb((db) => {
				authenticate(db, req);
				return { time: new Date(now() * 1000).toISOString() };
			}),
	},
	{
		method: "POST",
		path: "/api/question/bulk-delete",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const ids = req.body?.question_ids;
				if (!ids?.length) throw new HttpError(400, { message: "question_ids is required" });
				let deleted = 0;
				for (const qid of ids) {
					const index = db.questions.findIndex((q) => q.id === qid);
					if (index !== -1) {
						db.questions.splice(index, 1);
						deleted += 1;
					}
					removeGame(db, qid);
				}
				return { message: `Deleted ${deleted} questions`, deleted_count: deleted };
			}),
	},
	{
		method: "GET",
		path: "/api/question",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const filterField = {
					match_id: { field: "id", op: "like" },
					gt_id: { field: "id", op: "gt" },
					lt_id: { field: "id", op: "lt" },
					match_name: { field: "name", op: "like" },
					match: {
						match_name: { field: (q, ctx) => ctx.match?.name, op: "like" },
						match_is_active: { field: (q, ctx) => ctx.match?.is_active, op: "like" },
						eq_round_id: { field: (q, ctx) => ctx.match?.round_id, op: "eq" },
						eq_id: { field: "match_id", op: "eq" },
					},
				};
				let rows = filterRows(db.questions, req.query, filterField, (q) => ({
					match: db.matches.find((m) => m.id === q.match_id),
				}));
				rows = [...rows].sort(
					(a, b) => a.order - b.order || String(a.createdAt).localeCompare(String(b.createdAt)),
				);
				if (!auth.is_admin) {
					rows = rows.filter((q) => teamInMatch(db, auth.id, q.match_id));
				}
				return { count: rows.length, data: rows.map((q) => questionPublic(db, q)) };
			}),
	},
	{
		method: "GET",
		path: "/api/question/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				const row = db.questions.find((q) => q.id === req.params.id);
				if (!row) throw new HttpError(404, { message: "Question not found" });
				if (!auth.is_admin && !teamInMatch(db, auth.id, row.match_id)) {
					throw new HttpError(404, { message: "Question not found" });
				}
				return questionPublic(db, row);
			}),
	},
	{
		method: "POST",
		path: "/api/question",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const { name, description, match_id, raw_questions } = req.body || {};
				if (!match_id) throw new HttpError(406, { message: "match_id invalid" });
				const match = db.matches.find((m) => m.id === Number(match_id));
				if (!match) throw new HttpError(404, { message: "Match not found" });
				if (db.questions.some((q) => q.name === name && q.match_id === Number(match_id))) {
					throw new HttpError(400, { message: "Duplicated name" });
				}
				const id = uuid();
				const maxOrder = Math.max(
					0,
					...db.questions.filter((q) => q.match_id === Number(match_id)).map((q) => q.order),
				);
				const iso = new Date(now() * 1000).toISOString();
				const question = {
					id,
					name,
					description: description ?? null,
					question_data: JSON.stringify(raw_questions),
					order: maxOrder + 1,
					match_id: Number(match_id),
					createdAt: iso,
					updatedAt: iso,
				};
				// Register the game on the (mock) game service — rollback on failure,
				// surfacing the service's error as a 500 like the real controller.
				try {
					registerGame(db, {
						game_id: id,
						start_time: Date.parse(match.start_time) / 1000,
						end_time: Date.parse(match.end_time) / 1000,
						...(raw_questions || {}),
					});
				} catch (e) {
					const detail = e instanceof HttpError ? e.data?.detail ?? e.data : e.message;
					throw new HttpError(500, {
						message: typeof detail === "string" ? detail : JSON.stringify(detail),
					});
				}
				db.questions.push(question);
				return created(questionPublic(db, question));
			}),
	},
	{
		method: "PUT",
		path: "/api/question/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.questions.find((q) => q.id === req.params.id);
				if (!row) throw new HttpError(404, { message: "Not found" });
				const { id, token, match, raw_questions, type, ...fields } = req.body || {};
				Object.assign(row, fields, { updatedAt: new Date(now() * 1000).toISOString() });
				return { id: row.id };
			}),
	},
	{
		method: "DELETE",
		path: "/api/question/:id",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.questions.find((q) => q.id === req.params.id);
				if (!row) throw new HttpError(404, { message: "Question not found" });
				// Real backend bug reproduced: ReferenceError before the service
				// call -> transaction rollback -> 500. Use bulk-delete instead.
				throw new HttpError(500, { message: "question_id is not defined" });
			}),
	},
	{
		method: "GET",
		path: "/api/question/:id/optimal-answers",
		handler: (req) =>
			withDb((db) => {
				const auth = authenticate(db, req);
				requireAdmin(auth);
				const row = db.questions.find((q) => q.id === req.params.id);
				if (!row) throw new HttpError(404, { message: "Question not found" });
				return { question_id: row.id, moves: [] };
			}),
	},

	// ---- answers (legacy pages are hidden; harmless stubs) -----------------------
	{
		method: "GET",
		path: "/api/answer",
		handler: (req) =>
			withDb((db) => {
				authenticate(db, req);
				return { count: 0, data: [], page: 0, limit: 50, totalPages: 0 };
			}),
	},
	{
		method: "GET",
		path: "/api/answer/summary",
		handler: (req) =>
			withDb((db) => {
				authenticate(db, req);
				return [];
			}),
	},
];

export const teamManagerAdapter = makeAdapter({ name: "team-manager", routes });
