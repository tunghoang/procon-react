// node src/utils/config-refetch.test.mjs
import assert from "node:assert/strict";
import {
	PUBLISH_LOOKAHEAD_SECONDS,
	initialConfigMemo,
	planConfigRefetch,
	publicationImminent,
} from "./config-refetch.js";

// A fixed "now" and a schedule around it, in epoch seconds.
const NOW_MS = Date.UTC(2026, 8, 18, 10, 0, 0);
const NOW_S = NOW_MS / 1000;

/** A redacted pre-match config: schedule only, no map. */
const withheld = (startsAt, limit = 60) => ({
	board_withheld: true,
	agents: [3, 7, 11],
	startsAt,
	agent_selection_time_limit: limit,
});
const FULL = { map: { width: 8, height: 8, cells: [] }, agents: [3, 7, 11] };

/**
 * Drive the effect the way React would: one call per render, feeding the memo
 * forward, and re-rendering whenever `teamConfig` is replaced.
 */
const run = (steps) => {
	let memo = initialConfigMemo();
	const fetches = [];
	for (const step of steps) {
		const { fetch, memo: nextMemo } = planConfigRefetch({
			nowMs: NOW_MS,
			...step,
			memo,
		});
		memo = nextMemo;
		fetches.push(fetch);
	}
	return fetches;
};

const selecting = (n) => ({ status: "selecting_agents", poll: n });
const playing = (n) => ({ status: "in_progress", poll: n });

// --- publicationImminent ------------------------------------------------
{
	assert.equal(PUBLISH_LOOKAHEAD_SECONDS, 15);
	// Board goes out at startsAt - limit. An hour away: not yet.
	assert.equal(publicationImminent(withheld(NOW_S + 3600, 60), NOW_MS), false);
	// Exactly at the lookahead boundary: yes.
	assert.equal(
		publicationImminent(withheld(NOW_S + 60 + PUBLISH_LOOKAHEAD_SECONDS, 60), NOW_MS),
		true,
	);
	// One second before the boundary: no.
	assert.equal(
		publicationImminent(withheld(NOW_S + 61 + PUBLISH_LOOKAHEAD_SECONDS, 60), NOW_MS),
		false,
	);
	// Already published (we are inside the window, or past Day 1): yes.
	assert.equal(publicationImminent(withheld(NOW_S + 10, 60), NOW_MS), true);
	assert.equal(publicationImminent(withheld(NOW_S - 300, 60), NOW_MS), true);
	// No schedule at all (practice, or a payload without startsAt): always ask.
	assert.equal(publicationImminent({ board_withheld: true }, NOW_MS), true);
	assert.equal(publicationImminent(undefined, NOW_MS), true);
	// A zero-length window means the board appears with Day 1.
	assert.equal(publicationImminent(withheld(NOW_S + 3600, 0), NOW_MS), false);
	assert.equal(
		publicationImminent(withheld(NOW_S + PUBLISH_LOOKAHEAD_SECONDS, 0), NOW_MS),
		true,
	);
	// A nonsense limit is treated as 0 rather than inventing a window.
	assert.equal(
		publicationImminent({ board_withheld: true, startsAt: NOW_S + 3600 }, NOW_MS),
		false,
	);
}

// --- 1. first load -------------------------------------------------------
{
	// No state yet, no config: fetch immediately, whatever the schedule.
	assert.deepEqual(
		run([{ isAdmin: false, gameId: "7", teamConfig: null, state: null }]),
		[true],
	);
}

// --- 2. THE LEAD-IN: no polling for hours -------------------------------
{
	const far = withheld(NOW_S + 3600, 60); // starts in an hour
	const fetches = run([
		// First render fetches (we have nothing).
		{ isAdmin: false, gameId: "7", teamConfig: null, state: selecting(1) },
		// The withheld schedule arrives -> now we know publication is an hour
		// out, so every subsequent poll is skipped.
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(1) },
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(2) },
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(3) },
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(4) },
	]);
	assert.deepEqual(fetches, [true, false, false, false, false]);
}

// --- 3. once publication is imminent, re-ask ONCE PER POLL --------------
{
	const soon = withheld(NOW_S + 10, 60); // window already open
	const pollA = selecting(1);
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: null, state: pollA },
		// The withheld config arrives -> re-render with the SAME poll. This is
		// the loop that used to hammer the engine.
		{ isAdmin: false, gameId: "7", teamConfig: soon, state: pollA },
		{ isAdmin: false, gameId: "7", teamConfig: soon, state: pollA },
		// Next poll: ask once more, the board may be out now.
		{ isAdmin: false, gameId: "7", teamConfig: soon, state: selecting(2) },
		{ isAdmin: false, gameId: "7", teamConfig: soon, state: selecting(3) },
	]);
	assert.deepEqual(fetches, [true, false, false, true, true]);
}

// --- 4. once the board is published, stop asking ------------------------
{
	const soon = withheld(NOW_S + 10, 60);
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: soon, state: playing(1) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(1) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(2) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(3) },
	]);
	assert.deepEqual(fetches, [true, false, false, false]);
}

// --- 5. leaving a phase forces one fetch, lead-in or not ---------------
{
	// Even a config that does NOT claim to be withheld is re-read once when
	// the engine moves selecting_agents -> in_progress.
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: selecting(1) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: selecting(2) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(3) },
		// The refreshed config lands; no further fetch on the same poll.
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(3) },
		{ isAdmin: false, gameId: "7", teamConfig: FULL, state: playing(4) },
	]);
	assert.deepEqual(fetches, [false, false, true, false, false]);
}
{
	// A phase change overrides the lead-in skip: if the engine says the match
	// moved on, our stale schedule is exactly what must be re-read (e.g. the
	// question was reset to a nearer start time).
	const far = withheld(NOW_S + 3600, 60);
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(1) },
		{ isAdmin: false, gameId: "7", teamConfig: far, state: selecting(2) },
		{ isAdmin: false, gameId: "7", teamConfig: far, state: playing(3) },
	]);
	assert.deepEqual(fetches, [false, false, true]);
}

// --- 6. a failed fetch is retried on the next poll ---------------------
{
	// teamConfig stays null (the request failed), so every poll tries again --
	// the lead-in guard needs a payload to read the schedule from.
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: null, state: selecting(1) },
		{ isAdmin: false, gameId: "7", teamConfig: null, state: selecting(2) },
		{ isAdmin: false, gameId: "7", teamConfig: null, state: selecting(3) },
	]);
	assert.deepEqual(fetches, [true, true, true]);
}

// --- 7. admins and missing ids never call it ---------------------------
{
	assert.deepEqual(
		run([
			{ isAdmin: true, gameId: "7", teamConfig: null, state: selecting(1) },
			{ isAdmin: true, gameId: "7", teamConfig: null, state: playing(2) },
		]),
		[false, false],
	);
	assert.deepEqual(
		run([{ isAdmin: false, gameId: null, teamConfig: null, state: selecting(1) }]),
		[false],
	);
}

// --- 8. an admin's phase is still tracked -----------------------------
{
	// Switching roles mid-screen is not a thing, but the memo must not report
	// a bogus "phase changed" the first time a team render happens.
	const out = planConfigRefetch({
		isAdmin: true,
		gameId: "7",
		teamConfig: FULL,
		state: selecting(1),
		memo: initialConfigMemo(),
		nowMs: NOW_MS,
	});
	assert.equal(out.fetch, false);
	assert.equal(out.memo.phase, "selecting_agents");
}

// --- 9. a practice config (no schedule) still refreshes ---------------
{
	// No startsAt to wait for, so a withheld practice payload is re-asked per
	// poll rather than being stuck forever.
	const practice = { board_withheld: true, agents: [1, 2] };
	const fetches = run([
		{ isAdmin: false, gameId: "7", teamConfig: practice, state: selecting(1) },
		{ isAdmin: false, gameId: "7", teamConfig: practice, state: selecting(2) },
	]);
	assert.deepEqual(fetches, [true, true]);
}

console.log("config-refetch: all assertions passed");
