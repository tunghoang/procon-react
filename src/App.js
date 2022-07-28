import "./App.css";
import { useRoutes, usePath } from "hookrouter";
import React from "react";
import { useEffect, useState, useContext } from "react";
import Tournaments from "./pages/tournaments.js";
import Matches from "./pages/matches";
import Teams from "./pages/teams.js";
import Rounds from "./pages/rounds";
import Questions from "./pages/questions";
import Answers from "./pages/answers";
import Login from "./pages/login.js";

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

const routes = {
  "/": () => ({ component: Tournaments, props: {} }),
  "/login": () => ({ component: Login, props: {} }),
  "/teams": () => ({ component: Teams, props: {} }),
  "/matches": () => ({ component: Matches, props: {} }),
  "/rounds": () => ({ component: Rounds, props: {} }),
  "/questions": () => ({ component: Questions, props: {} }),
  "/answers": () => ({ component: Answers, props: {} }),
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
  const [token, setToken] = useState(null);
  const [teamname, setTeamname] = useState(null);
  const [locale, setLocale] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [round, setRound] = useState(null);
  useEffect(() => {
    if (!token) {
      setToken(localStorage.getItem("token"));
    }
    if (!teamname) {
      setTeamname(localStorage.getItem("teamname"));
    }
    if (!locale) {
      setLocale(localStorage.getItem("locale"));
    }
  }, [token, teamname, locale]);

  return (
    <Context.Provider
      value={{
        token,
        locale: localStorage.getItem("locale") || "vi-VN",
        teamname,
        tournament,
        round,
        updateContext: ({ tournament, round }) => {
          if (tournament !== undefined) setTournament(tournament);
          if (round !== undefined) setRound(round);
        },
        updateLocalStorage: ({ token, teamname, locale }) => {
          if (token !== undefined) {
            setLocalStorage(token, "token");
            setToken(token);
          }
          if (teamname !== undefined) {
            setLocalStorage(teamname, "teamname");
            setTeamname(teamname);
          }
          if (locale !== undefined) {
            setLocalStorage(locale, "locale");
            setLocale(locale);
          }
        },
      }}
    >
      <AppInternal />
    </Context.Provider>
  );
}
function AppInternal() {
  const { token, locale, tournament } = useContext(Context);
  const match = useRoutes(routes);
  const getLayout = match.component.getLayout ?? ((page) => page);

  const path = usePath();
  if (!token) {
    if (path !== "/login") {
      setTimeout(() => navigate("/login"), 300);
    }
  } else {
    if (path === "/login") {
      setTimeout(() => navigate("/"), 300);
    }
  }

  return (
    <IntlProvider locale={locale} messages={loadMessages(locale)}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={themeFn(locale)}>
          <ConfirmProvider>
            <CssBaseline />
            {token ? (
              tournament ? (
                getLayout(React.createElement(match.component, match.props))
              ) : (
                <Tournaments />
              )
            ) : (
              <Login />
            )}
          </ConfirmProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </IntlProvider>
  );
}

export default App;
