// node src/utils/agent-kinds.test.mjs
import assert from "node:assert/strict";
import {
	PATROL,
	REFUEL,
	normalizeKinds,
	submittedKindsOf,
	toKindCode,
} from "./agent-kinds.js";

// --- the shape /game/state actually sends (AgentType is a str enum) -------
assert.equal(toKindCode("refuel"), REFUEL);
assert.equal(toKindCode("patrol"), PATROL);
// ...and the numeric shape /game/day and the submit body use.
assert.equal(toKindCode(1), REFUEL);
assert.equal(toKindCode(0), PATROL);
// Anything else is patrol, never a silent crash.
assert.equal(toKindCode(undefined), PATROL);
assert.equal(toKindCode(null), PATROL);
assert.equal(toKindCode("REFUEL"), PATROL); // the enum value is lower-case
assert.equal(toKindCode("2"), PATROL);
assert.equal(toKindCode(true), PATROL);

// --- the regression this file exists for --------------------------------
{
	// A team that chose patrol + two refuel cars, as /game/state reports it.
	// The old numeric-only check turned this into [0,0,0], so the picker
	// showed all-patrol and a second submit really did overwrite the choice.
	assert.deepEqual(normalizeKinds(["patrol", "refuel", "refuel"], 3), [0, 1, 1]);
	// Same selection over the numeric wire shape.
	assert.deepEqual(normalizeKinds([0, 1, 1], 3), [0, 1, 1]);
	// Mixed (defensive: a service version that sends one of each).
	assert.deepEqual(normalizeKinds(["patrol", 1, "refuel"], 3), [0, 1, 1]);
}

// --- length is always the roster's -------------------------------------
assert.deepEqual(normalizeKinds(null, 3), [0, 0, 0]);
assert.deepEqual(normalizeKinds(undefined, 2), [0, 0]);
assert.deepEqual(normalizeKinds(["refuel"], 3), [1, 0, 0]); // padded
assert.deepEqual(normalizeKinds(["refuel", "refuel", "refuel"], 2), [1, 1]); // truncated
assert.deepEqual(normalizeKinds(["refuel"], 0), []);
assert.deepEqual(normalizeKinds(["refuel"], -1), []);

// --- reading a /game/state team entry -----------------------------------
{
	const chosen = {
		types_selected: true,
		agents: [
			{ agent_id: 0, type: "patrol", cell: 3, fuel: 40 },
			{ agent_id: 1, type: "refuel", cell: 7, fuel: null },
			{ agent_id: 2, type: "refuel", cell: 11, fuel: null },
		],
	};
	assert.deepEqual(submittedKindsOf(chosen), [0, 1, 1]);

	// Nothing chosen yet -> null, so the panel keeps its own (all-patrol)
	// default instead of pretending the engine holds a choice.
	assert.equal(submittedKindsOf({ types_selected: false, agents: chosen.agents }), null);
	assert.equal(submittedKindsOf(undefined), null);
	assert.equal(submittedKindsOf(null), null);
	// Selected but no agents list (practice/edge) -> empty, not a throw.
	assert.deepEqual(submittedKindsOf({ types_selected: true }), []);
}

console.log("agent-kinds: all assertions passed");
