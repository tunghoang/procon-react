// localStorage-backed mock database shared by both mock backends.
//
// Shape (all times are epoch seconds unless noted; team-manager date columns
// are ISO strings, matching Sequelize's JSON output):
// {
//   seedVersion, seededAt,
//   autoIds: { team, tournament, round, match, answer },
//   teams:       [{ id, name, account, password, is_admin, createdAt, updatedAt }],
//   tournaments: [{ id, name, description, createdAt, updatedAt }],
//   rounds:      [{ id, name, description, tournament_id, createdAt, updatedAt }],
//   matches:     [{ id, name, description, start_time, end_time, is_active, round_id, ... }],
//   teamMatch:   [{ match_id, team_id }],
//   questions:   [{ id (uuid), name, description, question_data (JSON string), order, match_id, ... }],
//   games:       { [gameId]: { init: <GameInitRequest body>, state: <engine game object> } },
//   selections:  [{ game_id, team_id, types, at }],            // scheduled bot agent-type picks
//   submissions: [{ game_id, team_id, day, actions, submitted_at }],
//   botTeamIds:  [ids],                                        // teams that auto-play
//   answers:     [],                                           // legacy, kept empty
// }

import { buildSeed, SEED_VERSION } from "./seed";
import { now, clearOffset } from "./clock";

const DB_KEY = "__hexudon_mock_db__";

let cache = null;

export const loadDb = () => {
	if (cache) return cache;
	try {
		const raw = localStorage.getItem(DB_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && parsed.seedVersion === SEED_VERSION) {
				cache = parsed;
				return cache;
			}
		}
	} catch {
		// fall through to reseed
	}
	cache = buildSeed(now());
	cache.seedVersion = SEED_VERSION;
	cache.seededAt = now();
	saveDb();
	return cache;
};

export const saveDb = () => {
	if (cache) localStorage.setItem(DB_KEY, JSON.stringify(cache));
};

export const resetDb = () => {
	localStorage.removeItem(DB_KEY);
	clearOffset();
	cache = null;
};

// Load, run a (possibly mutating) function, persist, return its result.
export const withDb = (fn) => {
	const db = loadDb();
	const result = fn(db);
	saveDb();
	return result;
};

export const nextId = (db, key) => {
	db.autoIds[key] = (db.autoIds[key] || 0) + 1;
	return db.autoIds[key];
};

export const uuid = () =>
	crypto.randomUUID
		? crypto.randomUUID()
		: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
			});
