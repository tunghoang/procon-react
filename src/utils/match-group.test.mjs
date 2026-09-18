// node src/utils/match-group.test.mjs
import assert from "node:assert/strict";
import { matchGroupId, sharedGroupId } from "./match-group.js";

// --- one match's group --------------------------------------------------
assert.equal(matchGroupId({ id: 1, group_id: 4 }), 4);
assert.equal(matchGroupId({ id: 1, group: { id: 4 } }), 4);
// The flat column wins, and strings from a form/select are normalised.
assert.equal(matchGroupId({ id: 1, group_id: "4", group: { id: 9 } }), 4);
assert.equal(matchGroupId({ id: 1, group_id: null }), null);
assert.equal(matchGroupId({ id: 1, group_id: "" }), null);
assert.equal(matchGroupId({ id: 1 }), null);
assert.equal(matchGroupId(null), null);
assert.equal(matchGroupId({ id: 1, group_id: "not a number" }), null);

// --- a set of matches ---------------------------------------------------
{
	// All in one group.
	assert.deepEqual(sharedGroupId([{ group_id: 4 }, { group_id: 4 }]), {
		mixed: false,
		groupId: 4,
	});
	// The same group expressed both ways, and as a string: still one group.
	assert.deepEqual(
		sharedGroupId([{ group_id: 4 }, { group: { id: 4 } }, { group_id: "4" }]),
		{ mixed: false, groupId: 4 },
	);
	// All ungrouped (an organiser's matches): no group to filter by.
	assert.deepEqual(sharedGroupId([{ group_id: null }, {}]), {
		mixed: false,
		groupId: null,
	});
	// Empty selection: nothing to refuse either.
	assert.deepEqual(sharedGroupId([]), { mixed: false, groupId: null });
	assert.deepEqual(sharedGroupId(undefined), { mixed: false, groupId: null });
}

// --- the cases that must be refused ------------------------------------
{
	// Two different groups.
	assert.deepEqual(sharedGroupId([{ group_id: 4 }, { group_id: 5 }]), {
		mixed: true,
		groupId: null,
	});
	// "Some grouped, some not" is mixed too: an ungrouped match accepts anyone,
	// a group match does not, so no single roster is valid for both.
	assert.deepEqual(sharedGroupId([{ group_id: 4 }, { group_id: null }]), {
		mixed: true,
		groupId: null,
	});
	assert.deepEqual(sharedGroupId([{}, { group: { id: 7 } }]), {
		mixed: true,
		groupId: null,
	});
}

console.log("match-group: all assertions passed");
