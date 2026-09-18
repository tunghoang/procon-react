/**
 * Which group a set of matches belongs to, for roster pickers.
 *
 * A group match only takes that group's members: the team-manager rejects the
 * WHOLE bulk add if any account is outside the group of any target match. So
 * before offering a roster for several matches at once (the Matches page's
 * bulk "Manage Teams", the Rounds page's "add teams to every match in this
 * round") the UI has to know whether those matches share one owner.
 *
 *  - one group, or all ungrouped -> filter the candidates to it
 *  - several groups              -> there is NO valid roster; refuse up front
 *    instead of sending a request that fails as a whole
 *
 * Pure: see `match-group.test.mjs`.
 */

/** A match's owning group id as a number, or null when it is ungrouped. */
export const matchGroupId = (match) => {
	const raw = match?.group_id ?? match?.group?.id ?? null;
	if (raw === null || raw === undefined || raw === "") return null;
	const id = Number(raw);
	return Number.isFinite(id) ? id : null;
};

/**
 * @param {Array} matches
 * @returns {{mixed: boolean, groupId: number|null}}
 *          `mixed` true = the matches span several groups (including "some
 *          grouped, some not"), and `groupId` is then meaningless.
 *          An empty list is not mixed and has no group.
 */
export const sharedGroupId = (matches) => {
	const ids = new Set((matches || []).map(matchGroupId));
	if (ids.size > 1) return { mixed: true, groupId: null };
	const [only] = [...ids];
	return { mixed: false, groupId: only ?? null };
};
