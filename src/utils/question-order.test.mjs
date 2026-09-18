// node src/utils/question-order.test.mjs
import assert from "node:assert/strict";
import {
	matchIdOf,
	orderArrowState,
	planOrderSwap,
	siblingsOf,
} from "./question-order.js";

const q = (id, match_id, order) => ({ id, match_id, order, name: `Q${id}` });

// A cross-match list, deliberately interleaved the way the API returns it.
const MIXED = [
	q(1, 10, 0),
	q(2, 20, 0),
	q(3, 10, 1),
	q(4, 20, 1),
	q(5, 10, 2),
];

// --- match id -------------------------------------------------------------
assert.equal(matchIdOf(q(1, 10, 0)), 10);
assert.equal(matchIdOf({ id: 1, match: { id: 42 } }), 42);
assert.equal(matchIdOf({ id: 1 }), null);
// The flat column wins over the joined row (they agree in practice).
assert.equal(matchIdOf({ id: 1, match_id: 7, match: { id: 42 } }), 7);

// --- siblings -------------------------------------------------------------
assert.deepEqual(
	siblingsOf(MIXED, q(3, 10, 1)).map((r) => r.id),
	[1, 3, 5],
);
assert.deepEqual(
	siblingsOf(MIXED, q(2, 20, 0)).map((r) => r.id),
	[2, 4],
);
// Sorted by `order`, not by list position.
assert.deepEqual(
	siblingsOf([q(1, 10, 2), q(2, 10, 0), q(3, 10, 1)], q(1, 10, 2)).map((r) => r.id),
	[2, 3, 1],
);

// --- the actual bug: never swap across matches ---------------------------
{
	// Q3 (match 10, order 1) moving up must meet Q1 (match 10), NOT Q2
	// (match 20), which is its neighbour in the flat list.
	const plan = planOrderSwap(MIXED, 3, "up");
	assert.equal(plan.current.id, 3);
	assert.equal(plan.target.id, 1);
	assert.equal(plan.current.match_id, plan.target.match_id);
	// Orders are exchanged.
	assert.equal(plan.currentOrder, 0);
	assert.equal(plan.targetOrder, 1);
}
{
	const plan = planOrderSwap(MIXED, 1, "down");
	assert.equal(plan.current.id, 1);
	assert.equal(plan.target.id, 3);
	assert.equal(plan.currentOrder, 1);
	assert.equal(plan.targetOrder, 0);
}
{
	// The last of its match cannot move down even though rows follow it.
	assert.equal(planOrderSwap(MIXED, 5, "down"), null);
	// ...and the first cannot move up.
	assert.equal(planOrderSwap(MIXED, 1, "up"), null);
	assert.equal(planOrderSwap(MIXED, 2, "up"), null);
	assert.equal(planOrderSwap(MIXED, 4, "down"), null);
}
{
	// Unknown row / empty list.
	assert.equal(planOrderSwap(MIXED, 999, "up"), null);
	assert.equal(planOrderSwap([], 1, "up"), null);
	assert.equal(planOrderSwap(undefined, 1, "up"), null);
}

// --- rows with no `order` yet -------------------------------------------
{
	const fresh = [
		{ id: 1, match_id: 10 },
		{ id: 2, match_id: 10 },
		{ id: 3, match_id: 10 },
	];
	const plan = planOrderSwap(fresh, 2, "up");
	assert.equal(plan.current.id, 2);
	assert.equal(plan.target.id, 1);
	// Distinct values, or the swap would write the same number to both rows.
	assert.equal(plan.currentOrder, 0);
	assert.equal(plan.targetOrder, 1);
	assert.notEqual(plan.currentOrder, plan.targetOrder);
}

// --- arrow enablement ---------------------------------------------------
assert.deepEqual(orderArrowState(MIXED, q(1, 10, 0)), { isFirst: true, isLast: false });
assert.deepEqual(orderArrowState(MIXED, q(3, 10, 1)), { isFirst: false, isLast: false });
assert.deepEqual(orderArrowState(MIXED, q(5, 10, 2)), { isFirst: false, isLast: true });
// A match with a single question: both arrows off.
assert.deepEqual(orderArrowState([q(9, 30, 0)], q(9, 30, 0)), {
	isFirst: true,
	isLast: true,
});
// A row that is not in the list at all: both off (never enabled by accident).
assert.deepEqual(orderArrowState(MIXED, q(99, 99, 0)), { isFirst: true, isLast: true });

console.log("question-order: all assertions passed");
