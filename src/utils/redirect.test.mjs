// node src/utils/redirect.test.mjs
import assert from "node:assert/strict";
import { buildRedirect, parseRedirect } from "./redirect.js";

// A plain path keeps an empty search.
assert.deepEqual(parseRedirect("/admin/questions"), {
	to: "/admin/questions",
	search: {},
});

// The query string must NOT stay in `to` (that is the 404 bug).
assert.deepEqual(parseRedirect("/admin/questions?round_id=7"), {
	to: "/admin/questions",
	search: { round_id: "7" },
});

// Several params, and values that were percent-encoded inside the query.
assert.deepEqual(
	parseRedirect("/admin/matches?round_id=7&match_name=Round%201"),
	{ to: "/admin/matches", search: { round_id: "7", match_name: "Round 1" } },
);

// The whole value encoded once (what older builds stored).
assert.deepEqual(
	parseRedirect(encodeURIComponent("/competition/game/42?tab=plan")),
	{ to: "/competition/game/42", search: { tab: "plan" } },
);

// A fragment is dropped -- the router owns the hash.
assert.deepEqual(parseRedirect("/admin/teams?x=1#frag"), {
	to: "/admin/teams",
	search: { x: "1" },
});

// Nothing usable -> null, so the caller picks its own landing page.
assert.equal(parseRedirect(""), null);
assert.equal(parseRedirect(null), null);
assert.equal(parseRedirect(undefined), null);
assert.equal(parseRedirect("?only=query"), null);
assert.equal(parseRedirect("relative/path"), null);

// Off-site targets are refused (open-redirect after login).
assert.equal(parseRedirect("https://evil.example/x"), null);
assert.equal(parseRedirect("//evil.example/x"), null);
assert.equal(parseRedirect(encodeURIComponent("//evil.example/x")), null);

// A stray % must not throw.
assert.deepEqual(parseRedirect("/admin/a%zzb"), {
	to: "/admin/a%zzb",
	search: {},
});

// buildRedirect round-trips through parseRedirect.
assert.equal(buildRedirect("/admin/questions", "?round_id=7"), "/admin/questions?round_id=7");
assert.equal(buildRedirect("/admin/questions", ""), "/admin/questions");
assert.equal(buildRedirect("", ""), "/");
assert.deepEqual(parseRedirect(buildRedirect("/a/b", "?c=d")), {
	to: "/a/b",
	search: { c: "d" },
});

console.log("redirect: all assertions passed");
