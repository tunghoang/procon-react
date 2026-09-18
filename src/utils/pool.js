/**
 * Bounded-concurrency helpers for talking to the HEXUDON game service.
 *
 * The engine rate-limits READS per token (config.py: 5/s, burst 10) and
 * `/game/reset` counts as a read too. A `Promise.all` over a 12-team roster
 * fires 12 requests in one tick, so the tail comes back 429 and the caller
 * silently shows zeros / a partial reset. Everything that fans out per team
 * must go through `runPool` instead.
 *
 * Pure JS on purpose (no React, no axios): `pool.test.mjs` runs it under plain
 * `node`.
 */

/** Default in-flight cap. Sized under the engine's 5/s read budget. */
export const DEFAULT_LIMIT = 3;

/**
 * Run `worker(item, index)` over `items` with at most `limit` in flight.
 *
 * Never rejects: the result is an `allSettled`-shaped array in INPUT order,
 * so a single failing team cannot discard the whole batch.
 *
 * @template T, R
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<R>} worker
 * @param {{limit?: number}} [options]
 * @returns {Promise<Array<{status: "fulfilled", value: R} | {status: "rejected", reason: any}>>}
 */
export const runPool = async (items, worker, { limit = DEFAULT_LIMIT } = {}) => {
	const list = Array.from(items || []);
	const results = new Array(list.length);
	if (!list.length) return results;
	const width = Math.max(1, Math.min(limit, list.length));
	let next = 0;

	const lane = async () => {
		for (;;) {
			const index = next;
			next += 1;
			if (index >= list.length) return;
			try {
				results[index] = {
					status: "fulfilled",
					value: await worker(list[index], index),
				};
			} catch (error) {
				results[index] = { status: "rejected", reason: error };
			}
		}
	};

	await Promise.all(Array.from({ length: width }, lane));
	return results;
};

/** True for the engine's (and any proxy's) "too many requests" answer. */
export const isRateLimited = (error) => error?.response?.status === 429;

/**
 * How long a 429 asks us to wait, in ms. Honours `Retry-After` in both of its
 * legal forms (delta-seconds and an HTTP date) and clamps to something a user
 * will actually sit through; falls back to 1 s when the header is absent.
 */
export const retryAfterMs = (error, fallbackMs = 1000) => {
	const raw =
		error?.response?.headers?.["retry-after"] ??
		error?.response?.headers?.["Retry-After"];
	if (raw === undefined || raw === null || raw === "") return fallbackMs;
	const seconds = Number(raw);
	if (Number.isFinite(seconds)) {
		return Math.min(30000, Math.max(0, Math.round(seconds * 1000)));
	}
	const at = Date.parse(String(raw));
	if (Number.isFinite(at)) {
		return Math.min(30000, Math.max(0, at - Date.now()));
	}
	return fallbackMs;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call `fn` and, if the engine answers 429, wait out `Retry-After` and call it
 * ONE more time. `onRateLimited(waitMs)` fires before the wait so the UI can
 * say "rate limited, retrying" instead of looking frozen or wrong.
 *
 * Deliberately a single retry: a live match must not turn one throttled poll
 * into an unbounded retry storm against the same budget.
 */
export const withRetryOn429 = async (fn, { onRateLimited, sleep = delay } = {}) => {
	try {
		return await fn();
	} catch (error) {
		if (!isRateLimited(error)) throw error;
		const waitMs = retryAfterMs(error);
		if (onRateLimited) onRateLimited(waitMs);
		await sleep(waitMs);
		return fn();
	}
};
