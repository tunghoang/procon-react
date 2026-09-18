import "./App.css";
import { RouterProvider, Outlet } from "@tanstack/react-router";
import React from "react";
import { useEffect, useState } from "react";

import Context from "./context";

import { IntlProvider } from "react-intl";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { ConfirmProvider } from "material-ui-confirm";

import themeFn from "./theme";

import { messagesFor, setIntlLocale } from "./i18n";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { setLocalStorage } from "./utils/commons";
import { jwtDecode } from "jwt-decode";
import LoadingPage from "./components/loading-page";
import { router } from "./router";
import { LOGOUT_EVENT, setRouter } from "./api/commons";
import { Agentation } from "agentation";

export function App() {
	const [token, setToken] = useState(localStorage.getItem("token"));
	const [team, setTeam] = useState(null);
	const [locale, setLocale] = useState(
		localStorage.getItem("locale") || "vi-VN"
	);
	const [tournament, setTournament] = useState(null);
	const [round, setRound] = useState(null);
	const [userMatch, setUserMatch] = useState(null);

	useEffect(() => {
		// Set router instance for API interceptor
		setRouter(router);
	}, []);

	// The axios layer clears the token from localStorage on a 401, but only
	// this component can clear it from STATE -- without that, `require-admin`
	// and every isStaff() check kept trusting the expired session (a Back
	// press re-rendered the admin area as if still signed in).
	useEffect(() => {
		const onLogout = () => setToken(null);
		window.addEventListener(LOGOUT_EVENT, onLogout);
		return () => window.removeEventListener(LOGOUT_EVENT, onLogout);
	}, []);

	useEffect(() => {
		if (token) {
			try {
				setTeam(jwtDecode(token));
			} catch (error) {
				console.error("Invalid token", error);
				setToken(null);
				localStorage.removeItem("token");
			}
		} else {
			// Logout (or a 401 auto-logout) clears the token but used to leave
			// the decoded team behind, so every isStaff()/role check went on
			// believing the previous session -- the admin area stayed reachable
			// and the navbar kept showing that account.
			setTeam(null);
		}
	}, [token]);

	// Keep the standalone intl instance (used by the axios layer's toasts,
	// which live outside the React tree) on the locale the UI is showing.
	useEffect(() => {
		setIntlLocale(locale);
	}, [locale]);

	// Update router context whenever token or team changes
	useEffect(() => {
		router.update({
			context: (prev) => ({
				...prev,
				token,
				team,
			}),
		});
	}, [token, team]);

	return (
		<Context.Provider
			value={{
				token,
				locale,
				team,
				tournament,
				round,
				userMatch,
				updateContext: ({ tournament, round, team, userMatch }) => {
					if (tournament !== undefined) setTournament(tournament);
					if (round !== undefined) setRound(round);
					if (team !== undefined) setTeam(team);
					if (userMatch !== undefined) setUserMatch(userMatch);
				},
				updateLocalStorage: ({ token, locale }) => {
					if (token !== undefined) {
						setLocalStorage(token, "token");
						setToken(token);
					}

					if (locale !== undefined) {
						setLocalStorage(locale, "locale");
						setLocale(locale);
					}
				},
			}}>
			<IntlProvider locale={locale} messages={messagesFor(locale)}>
				<LocalizationProvider dateAdapter={AdapterDateFns}>
					<ThemeProvider theme={themeFn(locale)}>
						<ConfirmProvider>
							<CssBaseline />
							{token && !team ? (
								<LoadingPage />
							) : (
								<RouterProvider router={router} />
							)}
							{/* Dev-only overlay. Vite exposes import.meta.env.DEV
							    (true under `vite dev`, false in production builds);
							    process.env.NODE_ENV is undefined in Vite client code,
							    so it must NOT be used to gate this. */}
							{import.meta.env.DEV && <Agentation />}
						</ConfirmProvider>
					</ThemeProvider>
				</LocalizationProvider>
			</IntlProvider>
		</Context.Provider>
	);
}

export default App;
