// node src/utils/reset-start.test.mjs
import assert from "node:assert/strict";
import {
	RESET_LEAD_SECONDS,
	SELECTION_FALLBACK_SECONDS,
	defaultStartsAt,
	defaultStartsAtInput,
	earliestStartsAt,
	selectionSecondsOf,
	toLocalInput,
} from "./reset-start.js";

// --- the window length off a stored init body ---------------------------
assert.equal(selectionSecondsOf('{"agent_selection_time_limit":45}'), 45);
assert.equal(selectionSecondsOf({ agent_selection_time_limit: 30 }), 30);
// 0 is a real answer: a board with no pre-match phase at all.
assert.equal(selectionSecondsOf('{"agent_selection_time_limit":0}'), 0);
// Absent, negative, unparseable, null -> the shared fallback.
assert.equal(selectionSecondsOf("{}"), SELECTION_FALLBACK_SECONDS);
assert.equal(selectionSecondsOf('{"agent_selection_time_limit":-5}'), SELECTION_FALLBACK_SECONDS);
assert.equal(selectionSecondsOf("not json"), SELECTION_FALLBACK_SECONDS);
assert.equal(selectionSecondsOf(null), SELECTION_FALLBACK_SECONDS);
assert.equal(selectionSecondsOf(undefined), SELECTION_FALLBACK_SECONDS);
assert.equal(selectionSecondsOf('{"agent_selection_time_limit":"abc"}'), SELECTION_FALLBACK_SECONDS);

// --- the floor is exactly the server's ----------------------------------
{
	// 2026-09-18T10:00:30Z -> floor is now + limit, to the second.
	const now = Date.UTC(2026, 8, 18, 10, 0, 30);
	assert.equal(earliestStartsAt(60, now), Math.floor(now / 1000) + 60);
	assert.equal(earliestStartsAt(0, now), Math.floor(now / 1000));
}

// --- the default: +180 s, rounded UP to the minute, never under the floor -
{
	assert.equal(RESET_LEAD_SECONDS, 180);
	// Walk every second of a two-minute span against several window lengths:
	// the prefilled default must ALWAYS clear the floor (that is the bug this
	// guards -- a floor-to-minute default could land under its own check) and
	// must always sit on a whole minute.
	const base = Date.UTC(2026, 8, 18, 10, 0, 0);
	for (const limit of [0, 1, 30, 45, 60, 90, 120, 3600]) {
		for (let offsetMs = 0; offsetMs < 120000; offsetMs += 1000) {
			const now = base + offsetMs;
			const dflt = defaultStartsAt(limit, now);
			const floor = earliestStartsAt(limit, now);
			assert.ok(
				dflt >= floor,
				`limit=${limit} offset=${offsetMs}: default ${dflt} < floor ${floor}`,
			);
			assert.equal(dflt % 60, 0, `default ${dflt} is not on a whole minute`);
			// ...and it is not absurdly far out: at most the lead plus one minute.
			assert.ok(dflt - floor <= RESET_LEAD_SECONDS + 60);
			assert.ok(dflt - floor >= RESET_LEAD_SECONDS - 60);
		}
	}
}

{
	// Worked example: 10:00:30, 60 s window -> floor 10:01:30, +180 s =
	// 10:04:30 -> rounded UP to 10:05:00.
	const now = Date.UTC(2026, 8, 18, 10, 0, 30);
	assert.equal(defaultStartsAt(60, now), Date.UTC(2026, 8, 18, 10, 5, 0) / 1000);
	// Already on a minute boundary: stays put rather than jumping a minute.
	const exact = Date.UTC(2026, 8, 18, 10, 0, 0);
	assert.equal(defaultStartsAt(60, exact), Date.UTC(2026, 8, 18, 10, 4, 0) / 1000);
}

// --- the datetime-local round trip --------------------------------------
{
	// The input string is LOCAL time and, parsed back as local time, must give
	// exactly the epoch second the default chose (whatever this machine's zone).
	for (const limit of [0, 45, 60]) {
		const now = Date.UTC(2026, 8, 18, 10, 0, 37);
		const value = defaultStartsAtInput(limit, now);
		assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		const parsedSec = Math.floor(new Date(value).getTime() / 1000);
		assert.equal(parsedSec, defaultStartsAt(limit, now));
		// ...and it still clears the floor after the round trip.
		assert.ok(parsedSec >= earliestStartsAt(limit, now));
	}
	// toLocalInput drops seconds.
	assert.equal(toLocalInput(Date.parse("2026-09-18T10:00:59Z")).length, 16);
}

console.log("reset-start: all assertions passed");
