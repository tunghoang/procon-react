/**
 * The Day-1 time a MANUAL question reset offers, and the floor it must clear.
 *
 * The engine puts the pre-match window in `[startsAt - limit, startsAt)`, so a
 * Day 1 closer than `limit` from now opens a window that is already (partly)
 * over -- every team gets defaulted to all-patrol. The team-manager refuses
 * that with a 400 (`rejectResetStartsAt`: `startsAt >= now + limit`), and this
 * is the browser's half of the same rule.
 *
 * The default adds a lead on top of the floor and rounds UP to the next whole
 * minute, because a `datetime-local` input only edits minutes: rounding DOWN
 * (what a floor-to-minute does) can land the prefilled value under the floor
 * and make the dialog's own default fail its own check.
 *
 * Pure: see `reset-start.test.mjs`.
 */

/** Pre-match window assumed when a board does not declare one. Mirrors the
 *  team-manager's DEFAULT_SELECTION_SECONDS (lib/questionSchedule.js). */
export const SELECTION_FALLBACK_SECONDS = 60;

/** Lead time offered on top of the window, so the admin has room to react. */
export const RESET_LEAD_SECONDS = 180;

const MINUTE = 60;

/** A question's agent-kind window in seconds, from its stored init body. */
export const selectionSecondsOf = (questionData) => {
	let data = questionData;
	if (typeof data === "string" || data == null) {
		try {
			data = JSON.parse(data || "{}");
		} catch {
			return SELECTION_FALLBACK_SECONDS;
		}
	}
	const limit = Number(data?.agent_selection_time_limit);
	// 0 is a real answer (no pre-match phase); absent/negative is not.
	return Number.isFinite(limit) && limit >= 0 ? limit : SELECTION_FALLBACK_SECONDS;
};

/** The earliest Day 1 the server will accept, in epoch SECONDS. */
export const earliestStartsAt = (limitSeconds, nowMs = Date.now()) =>
	Math.floor(nowMs / 1000) + limitSeconds;

/**
 * The default Day 1 to prefill, in epoch seconds, aligned to a whole minute.
 *
 * `ceil` to the minute guarantees `default >= floor`: rounding up can only
 * ever move the value further into the future.
 */
export const defaultStartsAt = (limitSeconds, nowMs = Date.now()) => {
	const target = earliestStartsAt(limitSeconds, nowMs) + RESET_LEAD_SECONDS;
	return Math.ceil(target / MINUTE) * MINUTE;
};

/** Epoch ms -> a `datetime-local` value (local clock, minute precision). */
export const toLocalInput = (epochMs) => {
	const d = new Date(epochMs);
	d.setSeconds(0, 0);
	return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 16);
};

/** The prefill for the reset dialog's `datetime-local` field. */
export const defaultStartsAtInput = (limitSeconds, nowMs = Date.now()) =>
	toLocalInput(defaultStartsAt(limitSeconds, nowMs) * 1000);
