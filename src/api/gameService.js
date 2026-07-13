import axios from "axios";
import { GAME_SERVICE_API } from "../config/env";

// Client for the HEXUDON game service (FastAPI, production/procon26-hexudon).
// It shares the team-manager JWT (same signing secret) but, unlike the
// team-manager, requires the standard "Bearer <token>" scheme, and reports
// errors under `detail` ({"detail": "..."} or a pydantic 422 detail array).
//
// Exported so the mock layer can swap this instance's transport adapter.
export const gameClient = axios.create({ baseURL: GAME_SERVICE_API });

gameClient.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

gameClient.interceptors.response.use((response) => response.data);

export const getGameError = (e) => {
	const detail = e.response?.data?.detail;
	if (typeof detail === "string") return detail;
	if (Array.isArray(detail)) {
		// pydantic 422 validation errors
		return detail
			.map((item) => `${(item.loc || []).join(".")}: ${item.msg}`)
			.join("; ");
	}
	return e.response?.data?.message || e.message;
};

// True when the endpoint simply doesn't exist on the running service
// (used to feature-detect the optional replay/actions-history endpoints).
export const isEndpointMissing = (e) =>
	e.response?.status === 404 || e.response?.status === 405;

// --- Official endpoints (match api/routes.py exactly) ---------------------

// Team only (admins get 403): one-time match configuration
// {startsAt, daySeconds, daySteps, map:{height,width,cells}, spots, agents,
//  fuelLimits, players, busyThreshold, jammedThreshold}
export const getGameConfig = (gameId) =>
	gameClient.get("/game/config", { params: { game_id: gameId } });

// Team only: current day info
// {endsAt, day, agents:[{kind,pos,fuel}], others:[{id,agents}], traffics:[{pos,status}]}
export const getGameDay = (gameId) =>
	gameClient.get("/game/day", { params: { game_id: gameId } });

// Team or admin: full state
// {status, day, steps_today, day_deadline_in, road_condition:{cell:status},
//  teams:{id:{types_selected, agents:[{agent_id,type,cell,fuel}], stock,
//  total_servings, distinct_types}}}
export const getGameState = (gameId) =>
	gameClient.get("/game/state", { params: { game_id: gameId } });

// Team or admin: {ranking:[teamId...], detail:{teamId:{distinct_types,
// cumulative_daily_types, total_servings, cumulative_response_time}}}
export const getGameResult = (gameId) =>
	gameClient.get("/game/result", { params: { game_id: gameId } });

// Team only. types: one 0 (patrol) / 1 (refuel) per agent, agent-index order.
export const selectAgentTypes = (gameId, types) =>
	gameClient.post("/game/agent-types", { game_id: gameId, types });

// Team only. actions: number[][] — 0..5 moves toward a direction, a negative
// integer waits |n| steps; each agent must consume exactly the day's steps.
export const submitActions = (gameId, day, actions) =>
	gameClient.post("/game/actions", { game_id: gameId, day, actions });

// --- History endpoints (training/audit feature, not part of the official
// ruleset -- but implemented for real on the checked-in FastAPI now).
// isEndpointMissing() is kept for older deployments that predate these.

export const getGameActions = (gameId) =>
	gameClient.get("/game/actions", { params: { game_id: gameId } });

export const getGameReplay = (gameId) =>
	gameClient.get("/game/replay", { params: { game_id: gameId } });

// --- Practice mode (self-paced, per-team solo games) ----------------------
// A practice question's per-team game id is `${questionId}:${teamId}`.

// Team only. Submit `day`'s plan in a practice game and advance it. Storing an
// earlier day resets the later days server-side. actions: number[][].
export const submitPracticeActions = (gameId, day, actions) =>
	gameClient.post("/game/practice/actions", { game_id: gameId, day, actions });

// Any authenticated team. Read a practice game's replay -- including another
// team's -- for the compare view (own game's replay works via getGameReplay too,
// but this one isn't blocked by the team-in-game check).
export const getPracticePeerReplay = (gameId) =>
	gameClient.get("/game/practice/peer", { params: { game_id: gameId } });

// Team only. Fork another team's practice game into your own through
// `uptoDay` (adopts their agent types + days 0..uptoDay; your later days reset).
export const copyPractice = (gameId, fromGameId, fromTeamId, uptoDay) =>
	gameClient.post("/game/practice/copy", {
		game_id: gameId,
		from_game_id: fromGameId,
		from_team_id: fromTeamId,
		upto_day: uptoDay,
	});

// Admin only. Wraps map_gen.py's MapGenerator server-side so the admin UI
// doesn't duplicate that connectivity/Dijkstra-verified algorithm in JS.
// Pure generation -- doesn't create a game. Returns the full /game/init body
// (game_id/startsAt/teams are placeholders the caller must replace with the
// real question id, the admin's chosen start time, and the match's actual
// team roster before saving).
export const generateMap = (difficulty, teams, seed) =>
	gameClient.post("/game/generate", {
		difficulty,
		teams,
		...(seed !== undefined && seed !== null ? { seed } : {}),
	});
