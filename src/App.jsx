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

import viVN from "./lang/vi.json";
import enUS from "./lang/en.json";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { setLocalStorage } from "./utils/commons";
import { jwtDecode } from "jwt-decode";
import LoadingPage from "./components/loading-page";
import { router } from "./router";
import { setRouter } from "./api/commons";

function loadMessages(locale) {
	switch (locale) {
		case "vi-VN":
			return viVN;
		case "en-US":
			return enUS;
		default:
			return enUS;
	}
}

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

	useEffect(() => {
		if (token) {
			try {
				setTeam(jwtDecode(token));
			} catch (error) {
				console.error("Invalid token", error);
				setToken(null);
				localStorage.removeItem("token");
			}
		}
	}, [token]);

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
			<IntlProvider locale={locale} messages={loadMessages(locale)}>
				<LocalizationProvider dateAdapter={AdapterDateFns}>
					<ThemeProvider theme={themeFn(locale)}>
						<ConfirmProvider>
							<CssBaseline />
							{token && !team ? (
								<LoadingPage />
							) : (
								<RouterProvider router={router} />
							)}
						</ConfirmProvider>
					</ThemeProvider>
				</LocalizationProvider>
			</IntlProvider>
		</Context.Provider>
	);
}

export default App;
