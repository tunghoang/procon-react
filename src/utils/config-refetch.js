/**
 * When to re-fetch a team's `GET /game/config`.
 *
 * The rules, pulled out of the play screen's effect so they can be tested
 * without React (see `config-refetch.test.mjs`):
 *
 *  1. No config yet -> fetch (and keep retrying on the next poll, so a
 *     transient failure never strands the agent-kind panel on a spinner).
 *  2. The config we hold is the REDACTED pre-match payload
 *     (`{board_withheld: true}`, no `map`) -> fetch again on every poll ONCE
 *     the board is about to be published. Fetching it only once was the P0:
 *     the plan editor stayed hidden and Day 1's first render dereferenced the
 *     missing `map`.
 *  3. The engine just left the phase it was in -> one more fetch, so a config
 *     cached during agent selection is replaced even if that payload happened
 *     not to carry the flag.
 *  4. Otherwise -> nothing.
 *
 * Rule 2 has TWO guards, and both matter:
 *
 *  - A question can be created hours (or days) before it starts, and a team
 *    that leaves the tab open would otherwise re-ask every 3 s for the whole
 *    lead-in: thousands of pointless requests against a per-token rate limit
 *    shared with teams that are actually playing. The withheld payload carries
 *    `startsAt` and `agent_selection_time_limit`, which is exactly when the
 *    board goes out, so nothing is asked until that moment is imminent.
 *  - Storing another withheld config CHANGES `teamConfig`, which re-runs the
 *    effect. `memo.fetchedFor` records the `state` object a fetch was made
 *    for -- `state` is a fresh object per poll, so identity pins the refetch
 *    to the poll cadence instead of spinning per render.
 */

/**
 * How early, in seconds, to start asking before the board's publication
 * instant (`startsAt - agent_selection_time_limit`). One poll is 3 s, so this
 * is several polls of slack for clock skew and latency -- the team gets the
 * board as soon as it exists, without polling through the lead-in.
 */
export const PUBLISH_LOOKAHEAD_SECONDS = 15;

/** The starting memo for a fresh screen. */
export const initialConfigMemo = () => ({ phase: null, fetchedFor: undefined });

/**
 * Is the board's publication instant close enough to start asking?
 *
 * Unknown schedule -> true: without `startsAt` there is nothing to wait for,
 * and a team that cannot see the board is worse than an extra request.
 * Practice configs have no window at all and land here too.
 */
export const publicationImminent = (teamConfig, nowMs = Date.now()) => {
	const startsAt = Number(teamConfig?.startsAt);
	if (!Number.isFinite(startsAt)) return true;
	const limitRaw = Number(teamConfig?.agent_selection_time_limit);
	const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : 0;
	const publishesAt = startsAt - limit;
	return nowMs / 1000 >= publishesAt - PUBLISH_LOOKAHEAD_SECONDS;
};

/**
 * @param {{isAdmin: boolean, gameId: any, teamConfig: any, state: any,
 *          memo: {phase: any, fetchedFor: any}, nowMs?: number}} input
 * @returns {{fetch: boolean, memo: {phase: any, fetchedFor: any}}}
 *          `memo` must be stored back before the next call.
 */
export const planConfigRefetch = ({
	isAdmin,
	gameId,
	teamConfig,
	state,
	memo,
	nowMs = Date.now(),
}) => {
	const previous = memo || initialConfigMemo();
	const phase = state?.status ?? null;
	// Admins never call /game/config (it 403s for them), and there is nothing
	// to ask about without a game id.
	if (isAdmin || !gameId) {
		return { fetch: false, memo: { ...previous, phase } };
	}
	// A phase is only "changed" once we have seen one, so the very first poll
	// does not count as a transition.
	const phaseChanged = previous.phase !== null && previous.phase !== phase;
	const next = { phase, fetchedFor: previous.fetchedFor };

	const haveBoard = !!teamConfig && !teamConfig.board_withheld;
	if (haveBoard && !phaseChanged) return { fetch: false, memo: next };
	// Still withheld, but publication is not due yet: sit out the lead-in. A
	// phase change is always worth one fetch (the engine moved on, so our idea
	// of the schedule may be the stale thing).
	if (!haveBoard && teamConfig && !phaseChanged && !publicationImminent(teamConfig, nowMs)) {
		return { fetch: false, memo: next };
	}
	// Already asked for this exact poll: wait for the next one.
	if (teamConfig && previous.fetchedFor === state) {
		return { fetch: false, memo: next };
	}
	return { fetch: true, memo: { phase, fetchedFor: state } };
};
