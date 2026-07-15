// In-app mock of the HEXUDON game service (FastAPI,
// production/procon26-hexudon/api/routes.py + deps.py). Routes, auth, status
// codes and error bodies mirror the real service; two DEMO-ONLY extras
// (GET /api/game/actions, GET /api/game/replay) exist only here — the UI
// feature-detects them and hides the related views against the real service.

import { makeAdapter, HttpError, fastApiError } from "./http";
import { withDb } from "./db";
import { decodeToken } from "./jwt";
import { now } from "./clock";
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
	isTeamInGame,
	generateValidPlan,
	buildReplay,
} from "./engine";

// --------------------------------------------------------------------------
// Auth (api/deps.py)
// --------------------------------------------------------------------------

const authenticate = (headers) => {
	const header = headers.get ? headers.get("Authorization") : headers.Authorization;
	if (!header) throw fastApiError(401, "Not authenticated");
	const token = String(header).startsWith("Bearer ") ? String(header).slice(7) : null;
	const payload = token ? decodeToken(token) : null;
	if (!payload) throw fastApiError(401, "invalid token");
	if (payload.is_admin) return { isAdmin: true, teamId: null };
	if (payload.id === undefined || payload.id === null) {
		throw fastApiError(401, "invalid token");
	}
	return { isAdmin: false, teamId: String(payload.id) };
};

const getGame = (db, gameId) => {
	const game = gameId ? db.games[gameId] : null;
	if (!game) throw fastApiError(404, "game not found");
	return game;
};

const requireTeamInGame = (auth, state) => {
	if (!auth.isAdmin && !isTeamInGame(state, auth.teamId)) {
		throw fastApiError(403, "team is not part of this game");
	}
};

// --------------------------------------------------------------------------
// Deterministic PRNG for bot plans (stable across reloads/replays)
// --------------------------------------------------------------------------

const hashSeed = (str) => {
	let h = 2166136261;
	for (let i = 0; i < str.length; i += 1) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

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

// --------------------------------------------------------------------------
// syncGame — the mock's stand-in for routes.py _sync_game + the deployed
// server's 5-second background loop.
// --------------------------------------------------------------------------

const syncGame = (db, gameId) => {
	const entry = getGame(db, gameId);
	if (!entry.state) entry.state = createGame(entry.init);
	const state = entry.state;

	// Apply due scheduled (seeded bot) agent-type selections.
	for (const sel of db.selections) {
		if (sel.game_id !== gameId || sel.applied) continue;
		if (sel.at > now()) continue;
		try {
			selectAgentTypes(state, String(sel.team_id), sel.types, sel.at);
		} catch {
			// window already closed etc. — drop it, like a late real request
		}
		sel.applied = true;
	}

	catchUp(state, now(), (day, dayStartTime) => {
		// Bots that haven't submitted for this day submit a generated plan.
		for (const teamId of entry.botTeamIds || []) {
			const existing = db.submissions.find(
				(s) => s.game_id === gameId && s.team_id === teamId && s.day === day,
			);
			if (existing) continue;
			const rand = mulberry32(hashSeed(`${gameId}:${day}:${teamId}`));
			let actions;
			try {
				actions = generateValidPlan(state, teamId, rand);
			} catch {
				actions = state.teams[teamId].agents.map(() => [-state.steps_today]);
			}
			db.submissions.push({
				game_id: gameId,
				team_id: teamId,
				day,
				actions,
				submitted_at: dayStartTime + 5 + rand() * 10,
			});
		}
		return db.submissions.filter((s) => s.game_id === gameId && s.day === day);
	});
	return entry;
};

// --------------------------------------------------------------------------
// Shared with the team-manager mock (question create/delete proxies)
// --------------------------------------------------------------------------

const validateInitBody = (body) => {
	const problems = [];
	const need = (cond, loc, msg) => {
		if (!cond) problems.push({ loc: ["body", ...loc], msg, type: "value_error" });
	};
	need(typeof body.game_id === "string" && body.game_id, ["game_id"], "field required");
	need(typeof body.startsAt === "number", ["startsAt"], "field required");
	need(Array.isArray(body.daySeconds) && body.daySeconds.length >= 1, ["daySeconds"], "ensure this value has at least 1 items");
	need(Array.isArray(body.daySteps) && body.daySteps.length >= 1, ["daySteps"], "ensure this value has at least 1 items");
	need(body.map && Number.isInteger(body.map.height) && Number.isInteger(body.map.width) && Array.isArray(body.map.cells), ["map"], "field required");
	need(Number.isInteger(body.fuelLimits) && body.fuelLimits > 0, ["fuelLimits"], "ensure this value is greater than 0");
	need(Number.isInteger(body.players) && body.players >= 1, ["players"], "ensure this value is greater than or equal to 1");
	need(Number.isInteger(body.busyThreshold), ["busyThreshold"], "field required");
	need(Number.isInteger(body.jammedThreshold), ["jammedThreshold"], "field required");
	need(Array.isArray(body.teams) && body.teams.length >= 1, ["teams"], "ensure this value has at least 1 items");
	if (problems.length) throw new HttpError(422, { detail: problems });

	if (body.daySeconds.length !== body.daySteps.length) {
		throw new HttpError(422, {
			detail: [{ loc: ["body"], msg: "daySeconds and daySteps must have the same length", type: "value_error" }],
		});
	}
	if (
		body.map.cells.length !== body.map.height ||
		body.map.cells.some((row) => !Array.isArray(row) || row.length !== body.map.width)
	) {
		throw new HttpError(422, {
			detail: [{ loc: ["body", "map"], msg: "map.cells shape must be height x width", type: "value_error" }],
		});
	}
	for (const row of body.map.cells) {
		for (const cell of row) {
			if (![0, 1, 2, 3].includes(cell)) {
				throw new HttpError(422, {
					detail: [{ loc: ["body", "map", "cells"], msg: `invalid terrain value ${cell}, must be 0-3`, type: "value_error" }],
				});
			}
		}
	}
	for (const [i, spot] of (body.spots || []).entries()) {
		if (!Number.isInteger(spot.stocks) || spot.stocks < 1) {
			throw new HttpError(422, {
				detail: [{ loc: ["body", "spots", i, "stocks"], msg: "ensure this value is greater than or equal to 1", type: "value_error" }],
			});
		}
	}
	for (const [i, team] of body.teams.entries()) {
		if (!Array.isArray(team.agents) || team.agents.length < 3 || team.agents.length > 8) {
			throw new HttpError(422, {
				detail: [{ loc: ["body", "teams", i, "agents"], msg: "ensure this value has at least 3 items and at most 8 items", type: "value_error" }],
			});
		}
	}
};

export const registerGame = (db, body) => {
	validateInitBody(body);
	if (db.games[body.game_id]) {
		throw fastApiError(409, `game_id '${body.game_id}' already exists`);
	}
	let state;
	try {
		state = createGame({ ...body, spots: body.spots || [] });
	} catch (e) {
		if (e instanceof GameError) throw fastApiError(400, e.message);
		throw e;
	}
	// Questions created from the admin UI have no scripted bots: the mock
	// bot teams (2-4) still auto-play so a demo match always has motion.
	db.games[body.game_id] = {
		init: { ...body },
		state,
		botTeamIds: (body.teams || [])
			.map((t) => String(t.team_id))
			.filter((id) => id !== "1"),
	};
	return { ok: true, game_id: body.game_id };
};

export const removeGame = (db, gameId) => {
	delete db.games[gameId];
	db.selections = db.selections.filter((s) => s.game_id !== gameId);
	db.submissions = db.submissions.filter((s) => s.game_id !== gameId);
};

// --------------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------------

const routes = [
	{
		method: "POST",
		path: "/api/game/init",
		handler: ({ body, headers }) => {
			const auth = authenticate(headers);
			if (!auth.isAdmin) throw fastApiError(403, "admin privileges required");
			return withDb((db) => registerGame(db, body || {}));
		},
	},
	{
		method: "GET",
		path: "/api/game/config",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			if (auth.isAdmin) throw fastApiError(403, "admin cannot fetch a team's config");
			return withDb((db) => {
				const entry = getGame(db, query.game_id);
				if (!entry.state) entry.state = createGame(entry.init);
				requireTeamInGame(auth, entry.state);
				return configForTeam(entry.state, auth.teamId);
			});
		},
	},
	{
		method: "POST",
		path: "/api/game/agent-types",
		handler: ({ body, headers }) => {
			const auth = authenticate(headers);
			if (auth.isAdmin) throw fastApiError(403, "admin cannot act as a team");
			if (!Array.isArray(body?.types) || body.types.some((t) => t !== 0 && t !== 1)) {
				throw new HttpError(422, {
					detail: [{ loc: ["body", "types"], msg: "each type must be 0 (patrol) or 1 (refuel)", type: "value_error" }],
				});
			}
			return withDb((db) => {
				const entry = syncGame(db, body.game_id);
				requireTeamInGame(auth, entry.state);
				try {
					return selectAgentTypes(entry.state, auth.teamId, body.types, now());
				} catch (e) {
					if (e instanceof GameError) throw fastApiError(400, e.message);
					throw e;
				}
			});
		},
	},
	{
		method: "POST",
		path: "/api/game/actions",
		handler: ({ body, headers }) => {
			const auth = authenticate(headers);
			if (auth.isAdmin) throw fastApiError(403, "admin cannot act as a team");
			if (!Array.isArray(body?.actions) || !Number.isInteger(body?.day)) {
				throw new HttpError(422, {
					detail: [{ loc: ["body", "actions"], msg: "field required", type: "value_error" }],
				});
			}
			body.actions.forEach((plan, i) => {
				if (!Array.isArray(plan) || plan.length === 0) {
					throw new HttpError(422, {
						detail: [{ loc: ["body", "actions", i], msg: `agent ${i}: action plan cannot be empty`, type: "value_error" }],
					});
				}
				for (const v of plan) {
					if (!Number.isInteger(v) || v > 5) {
						throw new HttpError(422, {
							detail: [{ loc: ["body", "actions", i], msg: `agent ${i}: value ${v} invalid -- must be <= -1 (wait) or 0-5 (move direction)`, type: "value_error" }],
						});
					}
				}
			});
			return withDb((db) => {
				const entry = syncGame(db, body.game_id);
				requireTeamInGame(auth, entry.state);
				try {
					validateActions(entry.state, auth.teamId, body.day, body.actions, now());
				} catch (e) {
					if (e instanceof GameError) throw fastApiError(409, e.message);
					throw e;
				}
				// Upsert (unique game_id+team_id+day) — last valid submission wins.
				const existing = db.submissions.find(
					(s) => s.game_id === body.game_id && s.team_id === auth.teamId && s.day === body.day,
				);
				if (existing) {
					existing.actions = body.actions;
					existing.submitted_at = now();
					// Count every resubmission (last valid one still wins scoring).
					existing.submit_count = (existing.submit_count || 1) + 1;
				} else {
					db.submissions.push({
						game_id: body.game_id,
						team_id: auth.teamId,
						day: body.day,
						actions: body.actions,
						submitted_at: now(),
						submit_count: 1,
					});
				}
				return { ok: true, day: body.day };
			});
		},
	},
	{
		method: "GET",
		path: "/api/game/day",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			if (auth.isAdmin) throw fastApiError(403, "admin cannot fetch a team's day info");
			return withDb((db) => {
				const entry = syncGame(db, query.game_id);
				requireTeamInGame(auth, entry.state);
				return dayInfoForTeam(entry.state, auth.teamId);
			});
		},
	},
	{
		method: "GET",
		path: "/api/game/state",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			return withDb((db) => {
				const entry = syncGame(db, query.game_id);
				requireTeamInGame(auth, entry.state);
				const view = stateView(entry.state, now());
				// Attach the current day's submission metadata (count + latest
				// time). A team sees ONLY its own; an admin sees every team's.
				const day = entry.state.day;
				Object.entries(view.teams || {}).forEach(([tid, tstate]) => {
					if (!auth.isAdmin && String(tid) !== String(auth.teamId)) return;
					const sub = db.submissions.find(
						(x) =>
							x.game_id === query.game_id &&
							String(x.team_id) === String(tid) &&
							x.day === day,
					);
					tstate.submit_count = sub ? sub.submit_count || 1 : 0;
					tstate.last_submitted_at = sub ? sub.submitted_at : null;
				});
				return view;
			});
		},
	},
	{
		method: "GET",
		path: "/api/game/result",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			return withDb((db) => {
				const entry = getGame(db, query.game_id);
				if (!entry.state) entry.state = createGame(entry.init);
				requireTeamInGame(auth, entry.state);
				return finalResult(entry.state);
			});
		},
	},
	{
		method: "DELETE",
		path: "/api/game/:game_id",
		handler: ({ params, headers }) => {
			const auth = authenticate(headers);
			if (!auth.isAdmin) throw fastApiError(403, "admin privileges required");
			return withDb((db) => {
				getGame(db, params.game_id);
				removeGame(db, params.game_id);
				return { ok: true, game_id: params.game_id };
			});
		},
	},

	// --- DEMO-ONLY extras (absent from the real FastAPI) -------------------
	{
		method: "GET",
		path: "/api/game/actions",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			return withDb((db) => {
				const entry = syncGame(db, query.game_id);
				requireTeamInGame(auth, entry.state);
				const state = entry.state;
				const resolvedBefore = state.status === "finished" ? Infinity : state.day;
				const rows = db.submissions
					.filter((s) => s.game_id === query.game_id)
					.filter(
						(s) =>
							auth.isAdmin ||
							s.team_id === auth.teamId ||
							s.day < resolvedBefore,
					)
					.map((s) => ({
						day: s.day,
						team_id: s.team_id,
						plan: s.actions,
						submitted_at: s.submitted_at,
						submit_count: s.submit_count || 1,
					}))
					.sort((a, b) => a.day - b.day || a.team_id.localeCompare(b.team_id));
				return { actions: rows };
			});
		},
	},
	{
		method: "GET",
		path: "/api/game/replay",
		handler: ({ query, headers }) => {
			const auth = authenticate(headers);
			return withDb((db) => {
				const entry = syncGame(db, query.game_id);
				requireTeamInGame(auth, entry.state);
				const state = entry.state;
				const total = state.day_configs.length;
				const resolved = state.status === "finished" ? total : Math.max(0, state.day);
				return buildReplay(
					entry.init,
					db.selections.filter((s) => s.game_id === query.game_id),
					db.submissions.filter((s) => s.game_id === query.game_id),
					resolved,
				);
			});
		},
	},
];

export const gameServiceAdapter = makeAdapter({ name: "game-service", routes });
