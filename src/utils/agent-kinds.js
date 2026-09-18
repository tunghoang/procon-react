/**
 * Agent-kind codes, and the two shapes the game service reports them in.
 *
 * The official wire format for a CHOICE is numeric: `POST /game/agent-types`
 * takes one 0 (patrol) / 1 (refuel) per agent, and `GET /game/day` reports
 * each agent's `kind` the same way.
 *
 * `GET /game/state` does NOT: the engine's `AgentType` is a `str` enum, so
 * `state.teams[id].agents[].type` comes back as `"patrol"` / `"refuel"`.
 * Reading that as if it were numeric silently mapped every already-chosen
 * refuel car back to patrol, which is exactly the value the panel would then
 * re-submit.
 *
 * Pure: see `agent-kinds.test.mjs`.
 */

export const PATROL = 0;
export const REFUEL = 1;

/** One value, in either shape -> 0 | 1. Anything unrecognised is patrol. */
export const toKindCode = (value) =>
	value === REFUEL || value === "refuel" ? REFUEL : PATROL;

/**
 * Normalise a team's kinds to exactly `agentCount` numeric codes.
 *
 * Always returns a full-length array (missing entries default to patrol) so
 * the picker's toggle list can never be shorter than the roster it renders.
 */
export const normalizeKinds = (source, agentCount) =>
	Array.from({ length: Math.max(0, agentCount | 0) }, (_, i) =>
		toKindCode(source?.[i]),
	);

/** The kinds a team has already submitted, read off a /game/state team entry. */
export const submittedKindsOf = (teamState) =>
	teamState?.types_selected
		? (teamState.agents || []).map((agent) => toKindCode(agent?.type))
		: null;
