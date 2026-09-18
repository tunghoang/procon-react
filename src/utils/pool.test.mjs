// node src/utils/pool.test.mjs
import assert from "node:assert/strict";
import {
	DEFAULT_LIMIT,
	isRateLimited,
	retryAfterMs,
	runPool,
	withRetryOn429,
} from "./pool.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

// --- runPool --------------------------------------------------------------

{
	// Results keep INPUT order even when the workers finish out of order.
	const items = [5, 1, 3, 2, 4];
	const results = await runPool(items, async (n) => {
		await new Promise((resolve) => setTimeout(resolve, n));
		return n * 10;
	});
	assert.deepEqual(
		results.map((r) => r.value),
		[50, 10, 30, 20, 40],
	);
	assert.ok(results.every((r) => r.status === "fulfilled"));
}

{
	// Never more than `limit` workers in flight.
	let inFlight = 0;
	let peak = 0;
	const items = Array.from({ length: 12 }, (_, i) => i);
	await runPool(
		items,
		async () => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await tick();
			inFlight -= 1;
		},
		{ limit: 3 },
	);
	assert.equal(peak, 3, `peak concurrency was ${peak}`);
	assert.equal(inFlight, 0);
}

{
	// One failure does not discard the batch, and it is reported in place.
	const results = await runPool([1, 2, 3], async (n) => {
		if (n === 2) throw new Error("boom");
		return n;
	});
	assert.equal(results[0].status, "fulfilled");
	assert.equal(results[1].status, "rejected");
	assert.equal(results[1].reason.message, "boom");
	assert.equal(results[2].value, 3);
}

{
	// Every item runs exactly once, whatever the limit.
	const seen = [];
	await runPool([1, 2, 3, 4, 5], async (n) => seen.push(n), { limit: 99 });
	assert.deepEqual(seen.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5]);
	assert.deepEqual(await runPool([], async () => 1), []);
	assert.deepEqual(await runPool(undefined, async () => 1), []);
	assert.equal(DEFAULT_LIMIT, 3);
}

// --- 429 handling ---------------------------------------------------------

const rateLimited = (retryAfter) => ({
	response: {
		status: 429,
		headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
	},
});

{
	assert.equal(isRateLimited(rateLimited("2")), true);
	assert.equal(isRateLimited({ response: { status: 500 } }), false);
	assert.equal(isRateLimited(new Error("network")), false);

	assert.equal(retryAfterMs(rateLimited("2")), 2000);
	assert.equal(retryAfterMs(rateLimited("0")), 0);
	assert.equal(retryAfterMs(rateLimited(undefined)), 1000); // no header -> fallback
	assert.equal(retryAfterMs(rateLimited("9999")), 30000); // clamped
	// HTTP-date form.
	const inTwoSeconds = new Date(Date.now() + 2000).toUTCString();
	const dated = retryAfterMs(rateLimited(inTwoSeconds));
	assert.ok(dated > 500 && dated <= 2000, `dated wait was ${dated}`);
}

{
	// One retry after the advertised wait, and the UI is told about it.
	let calls = 0;
	let announced = null;
	const slept = [];
	const value = await withRetryOn429(
		async () => {
			calls += 1;
			if (calls === 1) throw rateLimited("2");
			return "ok";
		},
		{ onRateLimited: (ms) => (announced = ms), sleep: (ms) => slept.push(ms) },
	);
	assert.equal(value, "ok");
	assert.equal(calls, 2);
	assert.equal(announced, 2000);
	assert.deepEqual(slept, [2000]);
}

{
	// A second 429 propagates: exactly ONE retry, never a storm.
	let calls = 0;
	await assert.rejects(
		withRetryOn429(
			async () => {
				calls += 1;
				throw rateLimited("1");
			},
			{ sleep: async () => {} },
		),
		(e) => e.response.status === 429,
	);
	assert.equal(calls, 2);
}

{
	// Anything that is not a 429 is passed straight through, unretried.
	let calls = 0;
	await assert.rejects(
		withRetryOn429(async () => {
			calls += 1;
			throw new Error("nope");
		}),
		/nope/,
	);
	assert.equal(calls, 1);
}

console.log("pool: all assertions passed");
