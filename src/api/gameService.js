import axios from "axios";
import { GAME_SERVICE_API } from "../config/env";

// Client for the HEXUDON game service (FastAPI, production/procon26-hexudon).
// It shares the team-manager JWT (same signing secret) but, unlike the
// team-manager, requires the standard "Bearer <token>" scheme, and reports
// errors under `detail` ({"detail": "..."} or a pydantic 422 detail array).
const gameClient = axios.create({ baseURL: GAME_SERVICE_API });

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

// Team or admin: team-independent board/match configuration
// {game_id, is_practice, startsAt, daySeconds, daySteps, map:{height,width,cells},
//  spots, fuelLimits, players, busyThreshold, jammedThreshold,
//  agent_selection_time_limit}. Unlike getGameConfig this omits per-team agents,
//  so an admin/spectator can read it too.
export const getGameBoardConfig = (gameId) =>
	gameClient.get("/game/board", { params: { game_id: gameId } });

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
// team's. The service collapses each day to its final frame only, so this
// exposes an opponent's END-OF-DAY position but never their step-by-step route
// (used to overlay opponents' final positions on the replay). Own game's replay
// works via getGameReplay too, but this one isn't blocked by the team-in-game check.
export const getPracticePeerReplay = (gameId) =>
	gameClient.get("/game/practice/peer", { params: { game_id: gameId } });

// Any authenticated team. Read a practice game's aggregate score ({ranking,
// detail}) -- powers the competitive-practice shared leaderboard, where each
// team plays its own solo game `${questionId}:${teamId}`. Exposes ranking/score
// only, never step-by-step moves; restricted to practice games server-side.
export const getPracticeScore = (gameId) =>
	gameClient.get("/game/practice/score", { params: { game_id: gameId } });

// --- Competitive practice (ONE shared timeline; game_id = bare question id) --
// Team or admin: the shared board (open day + overridable previous day) and the
// days-owned standings. Same for every team.
export const getCompetitiveState = (gameId) =>
	gameClient.get("/game/competitive/state", { params: { game_id: gameId } });

// Team only. Submit a day into the shared timeline: submitting the open day
// advances it; submitting the last resolved day OVERRIDES it, accepted only if
// the score strictly beats the current holder (server-enforced). actions:number[][].
export const submitCompetitiveActions = (gameId, day, actions) =>
	gameClient.post("/game/competitive/actions", { game_id: gameId, day, actions });

// Admin only. Reset a game to agent selection + delete every team's submissions,
// so the whole match is replayed from scratch. Plain practice = one game per team
// (call per team game). For a TIMED match, pass `startsAt` (epoch seconds) to
// re-anchor the schedule to a new Day-1 time; practice games are self-paced so
// it's ignored.
export const resetGame = (gameId, startsAt) =>
	gameClient.post(
		"/game/reset",
		startsAt != null ? { game_id: gameId, startsAt } : { game_id: gameId },
	);

// Team only. Reset your OWN practice game back to agent selection so you can
// play it again (clears your submissions across all days).
export const resetPractice = (gameId) =>
	gameClient.post("/game/practice/reset", { game_id: gameId });

// Admin only. Wraps map_gen.py's MapGenerator server-side so the admin UI
// doesn't duplicate that connectivity/Dijkstra-verified algorithm in JS.
// Pure generation -- doesn't create a game. Returns the full /game/init body
// (game_id/startsAt/teams are placeholders the caller must replace with the
// real question id, the admin's chosen start time, and the match's actual
// team roster before saving).
// Admin only. What each difficulty tier actually produces, straight from
// map_gen.py's DIFFICULTY_CONFIGS -> {difficulties: [{name, width, height,
// days, daySeconds, spots, brands, stocks, agents, selectionSeconds,
// pondRatio, roadRatio, mountainRatio, stepFraction, fuelFraction}]}, each
// value being {min, max, fixed}. Read (not hard-coded) so the dialog can't
// drift from the generator when the tiers are re-tuned.
export const getDifficulties = () => gameClient.get("/game/difficulties");

export const generateMap = (difficulty, teams, seed) =>
	gameClient.post("/game/generate", {
		difficulty,
		teams,
		...(seed !== undefined && seed !== null ? { seed } : {}),
	});
