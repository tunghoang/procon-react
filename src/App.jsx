import "./App.css";
import { useRoutes, usePath } from "hookrouter";
import React from "react";
import { useEffect, useState, useContext } from "react";
import Tournaments from "./pages/tournaments";
import Matches from "./pages/matches";
import Teams from "./pages/teams";
import Rounds from "./pages/rounds";
import Questions from "./pages/questions";
import Answers from "./pages/answers";
import Login from "./pages/login";

import Context from "./context";

import { IntlProvider } from "react-intl";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { ConfirmProvider } from "material-ui-confirm";

import themeFn from "./theme";

import viVN from "./lang/vi.json";
import enUS from "./lang/en.json";

import { navigate } from "hookrouter";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { setLocalStorage } from "./utils/commons";
import NotFound from "./pages/not-found";
import Competition from "./pages/user/competition";
import UserQuestion from "./pages/user/question";
import jwtDecode from "jwt-decode";
import { debugLog } from "./utils/debug";
import LoadingPage from "./components/loading-page";

const routes = {
	"/login": () => ({ component: Login, props: {} }),
	"/tournament": () => ({ component: Tournaments, props: {} }),
	"/tournament/:tournamentId": ({ tournamentId }) => ({
		component: Tournaments,
		props: { tournamentId },
	}),
	"/tournament/:tournamentId/rounds": ({ tournamentId }) => ({
		component: Rounds,
		props: { tournamentId },
	}),
	"/tournament/:tournamentId/round/:roundId": ({ tournamentId, roundId }) => ({
		component: Rounds,
		props: { tournamentId, roundId },
	}),
	"/tournament/:tournamentId/round/:roundId/matches": ({
		tournamentId,
		roundId,
	}) => ({
		component: Matches,
		props: { tournamentId, roundId },
	}),
	"/tournament/:tournamentId/round/:roundId/match/:matchId": ({
		tournamentId,
		roundId,
		matchId,
	}) => ({
		component: Matches,
		props: { tournamentId, roundId, matchId },
	}),
	"/tournament/:tournamentId/round/:roundId/match/:matchId/questions": ({
		tournamentId,
		roundId,
		matchId,
	}) => ({
		component: Questions,
		props: { tournamentId, roundId, matchId },
	}),
	"/tournament/:tournamentId/round/:roundId/match/:matchId/answers": ({
		tournamentId,
		roundId,
		matchId,
	}) => ({
		component: Answers,
		props: { tournamentId, roundId, matchId },
	}),
	"/teams": () => ({ component: Teams, props: {} }),
	"/matches": () => ({ component: Matches, props: {} }),
	"/rounds": () => ({ component: Rounds, props: {} }),
	"/answers": () => ({ component: Answers, props: {} }),
	"/questions": () => ({ component: Questions, props: {} }),
	"/competition": () => ({ component: Competition, props: {} }),
	"/competition/tournament/:tournamentId/round/:roundId": ({
		tournamentId,
		roundId,
	}) => ({
		component: Competition,
		props: { tournamentId, roundId },
	}),
	"/competition/tournament/:tournamentId/round/:roundId/match/:matchId/questions":
		() => ({ component: UserQuestion, props: {} }),
	"/question": () => ({
		component: UserQuestion,
		props: {},
	}),
	"/*": () => ({ component: NotFound, props: {} }),
};

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
			<AppInternal />
		</Context.Provider>
	);
}
function AppInternal() {
	const { token, locale, team } = useContext(Context);
	const path = usePath();
	const match = useRoutes(routes);
	const getLayout = match.component.getLayout ?? ((page) => page);

	// Debug logging
	debugLog("[AppInternal] Render:", {
		path,
		hasToken: !!token,
		hasTeam: !!team,
		isAdmin: team?.is_admin,
		timestamp: new Date().toISOString(),
	});

	useEffect(() => {
		debugLog("[AppInternal] useEffect triggered:", {
			path,
			hasToken: !!token,
			hasTeam: !!team,
			isAdmin: team?.is_admin,
		});

		// Only redirect when we have finished checking token and team
		if (!token && path !== "/login") {
			debugLog("[AppInternal] Redirecting to /login - no token");
			navigate("/login");
		} else if (token && team && path === "/") {
			// Redirect based on user role from root
			if (team.is_admin) {
				debugLog("[AppInternal] Redirecting to /tournament - admin user");
				navigate("/tournament");
			} else {
				debugLog("[AppInternal] Redirecting to /competition - non-admin user");
				navigate("/competition");
			}
		}
	}, [token, team, path]);

	// Show loading when:
	// 1. Token exists but team not loaded yet
	// 2. At root path "/" and needs redirect
	// 3. No token and not at login page (will redirect to login)
	if (
		(token && !team) ||
		(path === "/" && token) ||
		(!token && path !== "/login")
	) {
		return <LoadingPage />;
	}

	return (
		<IntlProvider locale={locale} messages={loadMessages(locale)}>
			<LocalizationProvider dateAdapter={AdapterDateFns}>
				<ThemeProvider theme={themeFn(locale)}>
					<ConfirmProvider>
						<CssBaseline />
						{getLayout(React.createElement(match.component, match.props))}
					</ConfirmProvider>
				</ThemeProvider>
			</LocalizationProvider>
		</IntlProvider>
	);
}

export default App;
