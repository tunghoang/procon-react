// Unsigned-but-well-formed JWTs for the mock backends. jwt-decode (used by
// the app) never verifies signatures, so a constant "mock" signature is fine.
// Payloads mirror the real team-manager tokens:
//   admin backdoor: { id: 0, name: "admin", is_admin: true }
//   team:           { id, name, is_admin: false, iat, exp } (exp = 2 days)

const encodeSegment = (obj) => {
	const json = JSON.stringify(obj);
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	bytes.forEach((b) => {
		binary += String.fromCharCode(b);
	});
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const decodeSegment = (segment) => {
	const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return JSON.parse(new TextDecoder().decode(bytes));
};

export const signToken = (payload) =>
	`${encodeSegment({ alg: "HS256", typ: "JWT" })}.${encodeSegment(payload)}.mock`;

// Returns the payload object, or null when the token is not a readable JWT
// (the mock's stand-in for jwt.verify failing -> 401).
export const decodeToken = (token) => {
	if (!token || typeof token !== "string") return null;
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	try {
		return decodeSegment(parts[1]);
	} catch {
		return null;
	}
};
