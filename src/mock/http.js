// Tiny in-app HTTP layer: a route table compiled into an axios *adapter*.
// The app's real axios instances keep their interceptors (auth headers,
// response unwrapping); only the transport is swapped, so the mock exercises
// the exact same request/response path as the real backends.

import { AxiosError, AxiosHeaders } from "axios";

const STATUS_TEXT = {
	200: "OK",
	201: "Created",
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	409: "Conflict",
	422: "Unprocessable Entity",
	429: "Too Many Requests",
	500: "Internal Server Error",
};

// Handlers throw this to produce a non-2xx response.
export class HttpError extends Error {
	constructor(status, data) {
		super(typeof data === "string" ? data : JSON.stringify(data));
		this.status = status;
		this.data = typeof data === "string" ? { message: data } : data;
	}
}

// FastAPI-style error body: {"detail": ...}
export const fastApiError = (status, detail) => new HttpError(status, { detail });

const compilePath = (pattern) => {
	const segments = pattern.split("/").filter(Boolean);
	return (pathSegments) => {
		if (pathSegments.length !== segments.length) return null;
		const params = {};
		for (let i = 0; i < segments.length; i += 1) {
			const expected = segments[i];
			if (expected.startsWith(":")) {
				params[expected.slice(1)] = decodeURIComponent(pathSegments[i]);
			} else if (expected !== pathSegments[i]) {
				return null;
			}
		}
		return params;
	};
};

const parseBody = (data) => {
	if (data === undefined || data === null) return undefined;
	if (typeof data === "string") {
		try {
			return JSON.parse(data);
		} catch {
			return data;
		}
	}
	return data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build an axios adapter from a route table.
 *
 * routes: [{ method: "GET", path: "/api/game/state", handler }, ...]
 *   - path supports ":param" segments.
 *   - handler({ params, query, body, headers, config }) returns the response
 *     body, or { __status, body } for non-200 success codes, or throws
 *     HttpError for failures.
 */
export const makeAdapter = ({ name, routes }) => {
	const compiled = routes.map((route) => ({
		method: route.method.toUpperCase(),
		match: compilePath(route.path),
		handler: route.handler,
	}));

	return async (config) => {
		// Resolve the absolute URL the app believes it is calling.
		const base = config.baseURL || "";
		const raw = /^https?:\/\//.test(config.url || "")
			? config.url
			: `${base.replace(/\/+$/, "")}${config.url?.startsWith("/") ? "" : "/"}${config.url || ""}`;
		const url = new URL(raw, "http://mock.local");

		const query = {};
		url.searchParams.forEach((value, key) => {
			query[key] = value;
		});
		for (const [key, value] of Object.entries(config.params || {})) {
			if (value !== undefined && value !== null) query[key] = String(value);
		}

		const pathSegments = url.pathname.split("/").filter(Boolean);
		const method = (config.method || "get").toUpperCase();
		const headers = AxiosHeaders.from(config.headers || {});

		const respond = (status, data) => {
			const response = {
				data,
				status,
				statusText: STATUS_TEXT[status] || "",
				headers: { "content-type": "application/json" },
				config,
				request: { __mock: name },
			};
			if (status >= 200 && status < 300) return response;
			const error = new AxiosError(
				`Request failed with status code ${status}`,
				status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
				config,
				response.request,
				response,
			);
			throw error;
		};

		// A dash of latency so spinners/optimistic paths behave like real life.
		await sleep(15 + Math.random() * 25);

		for (const route of compiled) {
			if (route.method !== method) continue;
			const params = route.match(pathSegments);
			if (!params) continue;
			try {
				const result = await route.handler({
					params,
					query,
					body: parseBody(config.data),
					headers,
					config,
				});
				if (result && typeof result === "object" && "__status" in result) {
					return respond(result.__status, result.body);
				}
				return respond(200, result ?? {});
			} catch (e) {
				if (e instanceof HttpError) return respond(e.status, e.data);
				throw e;
			}
		}

		return respond(404, { message: `mock ${name}: no route ${method} ${url.pathname}` });
	};
};

// Convenience for 201-created responses.
export const created = (body) => ({ __status: 201, body });
