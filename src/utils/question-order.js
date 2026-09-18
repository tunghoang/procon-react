/**
 * Question re-ordering rules.
 *
 * `order` is scoped to a MATCH: the team-manager numbers a match's questions
 * among themselves. The admin table, however, can list questions from several
 * matches at once (no round filter, or a round with many matches), and the
 * up/down arrows used to swap `order` with whatever row happened to sit next
 * to them in that flat list -- renumbering a question of a different match and
 * silently reordering it too.
 *
 * Pure: no React, no API. See `question-order.test.mjs`.
 */

/** A question's match id, from either the flat column or the joined row. */
export const matchIdOf = (row) => row?.match_id ?? row?.match?.id ?? null;

/**
 * The question's match-mates, in the order the table shows them.
 *
 * Rows are ordered by `order`, falling back to their position in the incoming
 * list when a row has none (which is what the `order` column renders), with
 * the list position as a stable tie-break.
 */
export const siblingsOf = (questions, row) => {
	const matchId = matchIdOf(row);
	return (questions || [])
		.map((q, index) => ({ q, index }))
		.filter(({ q }) => matchIdOf(q) === matchId)
		.sort(
			(a, b) =>
				(a.q.order ?? a.index) - (b.q.order ?? b.index) || a.index - b.index,
		)
		.map(({ q }) => q);
};

/**
 * Which two questions a move swaps, or null when the move is not possible.
 *
 * @param {Array} questions the rows as listed
 * @param {number|string} questionId the row whose arrow was clicked
 * @param {"up"|"down"} direction
 * @returns {{current: object, target: object, currentOrder: number,
 *            targetOrder: number} | null}
 *          `*Order` are the values to write back (already swapped: `current`
 *          takes `targetOrder` and vice versa).
 */
export const planOrderSwap = (questions, questionId, direction) => {
	const row = (questions || []).find((q) => q.id === questionId);
	if (!row) return null;
	const siblings = siblingsOf(questions, row);
	const index = siblings.findIndex((q) => q.id === questionId);
	if (index === -1) return null;
	const targetIndex = direction === "up" ? index - 1 : index + 1;
	if (targetIndex < 0 || targetIndex >= siblings.length) return null;
	const current = siblings[index];
	const target = siblings[targetIndex];
	// A row with no `order` yet is treated as holding its display position, so
	// the first move on a freshly created pair still produces two distinct
	// values instead of writing the same number twice.
	return {
		current,
		target,
		currentOrder: target.order ?? targetIndex,
		targetOrder: current.order ?? index,
	};
};

/**
 * Whether the up/down arrows should be enabled for a row.
 * @returns {{isFirst: boolean, isLast: boolean}}
 */
export const orderArrowState = (questions, row) => {
	const siblings = siblingsOf(questions, row);
	const index = siblings.findIndex((q) => q.id === row?.id);
	return {
		isFirst: index <= 0,
		isLast: index === siblings.length - 1,
	};
};
