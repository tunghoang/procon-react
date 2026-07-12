// In-app mock of BOTH production backends (team manager + HEXUDON game
// service), enabled with VITE_MOCK_API=1 (or runtime-config MOCK_API).
// It swaps the transport adapter of the app's two axios instances, so every
// interceptor, header and error path is exercised exactly as against the
// real services — no network, no MySQL/Redis required.

import { getEnv } from "../config/env";
import { api } from "../api/commons";
import { gameClient } from "../api/gameService";
import { teamManagerAdapter } from "./teamManager";
import { gameServiceAdapter } from "./gameServiceMock";
import { loadDb, resetDb, withDb } from "./db";
import * as clock from "./clock";

export const isMockEnabled = () => {
	const flag = String(getEnv("VITE_MOCK_API", "")).toLowerCase();
	return flag === "1" || flag === "true";
};

export const installMocks = () => {
	api.defaults.adapter = teamManagerAdapter;
	gameClient.defaults.adapter = gameServiceAdapter;

	loadDb(); // seed on first run

	// Console helpers for manual/E2E testing.
	window.__mock = {
		// Jump the mock clock forward (seconds) — running games catch up on
		// the next request, resolving any day whose deadline has passed.
		advance: (seconds) => {
			clock.advance(seconds);
			return `mock clock advanced ${seconds}s`;
		},
		now: () => clock.now(),
		// Wipe everything (accounts, games, submissions) and reseed relative
		// to the current time on next access.
		reset: () => {
			resetDb();
			return "mock db reset — reload the page";
		},
		dump: () => withDb((db) => JSON.parse(JSON.stringify(db))),
	};

	// eslint-disable-next-line no-console
	console.info(
		"[mock] In-app backend mocks installed (team manager + game service).\n" +
			"[mock] Accounts: admin/uetbmm, team01..team04 (password: password).\n" +
			"[mock] Helpers: __mock.advance(sec), __mock.reset(), __mock.dump()",
	);
};
