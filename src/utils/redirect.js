/**
 * Post-login redirect targets.
 *
 * TanStack Router's `navigate({to})` takes a PATH, not a URL: handing it
 * "/admin/questions?round_id=7" makes it look for a route literally named
 * that, which lands on the 404 page. The query string has to travel in
 * `search` instead. These helpers are the one place that split/join it, so the
 * login page and the 401 interceptors cannot drift apart.
 *
 * Pure JS (no React, no router): `redirect.test.mjs` runs it under plain node.
 */

/** Serialize a location into a single `redirect` search value. */
export const buildRedirect = (pathname, search = "") => {
	const path = pathname || "/";
	return `${path}${search || ""}`;
};

/**
 * Split a stored `redirect` value into router arguments.
 *
 * Accepts the raw value or a percent-encoded one (older builds wrapped it in
 * `encodeURIComponent`, and those links are still in browser histories).
 * Returns `{to, search}` where `search` is a plain object ready for
 * `navigate()`; a missing/unsafe value yields `null` so the caller can fall
 * back to its own default landing page.
 *
 * Only same-origin, root-relative paths are accepted: an absolute URL or a
 * protocol-relative "//evil.example" in a `?redirect=` link would otherwise
 * bounce a freshly authenticated user off-site.
 */
export const parseRedirect = (value) => {
	if (!value || typeof value !== "string") return null;
	let raw = value;
	// Decode at most once, and only when it actually is encoded -- a real path
	// may legitimately contain a % (decodeURIComponent would throw on "%zz").
	if (/%[0-9a-fA-F]{2}/.test(raw)) {
		try {
			raw = decodeURIComponent(raw);
		} catch {
			/* keep the raw value: better a bad path than a thrown navigate */
		}
	}
	if (!raw.startsWith("/") || raw.startsWith("//")) return null;
	const hashAt = raw.indexOf("#");
	const withoutHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
	const queryAt = withoutHash.indexOf("?");
	const to = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
	if (!to) return null;
	const search = {};
	if (queryAt !== -1) {
		const params = new URLSearchParams(withoutHash.slice(queryAt + 1));
		for (const [key, entry] of params.entries()) search[key] = entry;
	}
	return { to, search };
};

/** The current location as a `redirect` value (browser only). */
export const currentRedirect = () => {
	if (typeof window === "undefined") return "";
	return buildRedirect(window.location.pathname, window.location.search);
};
