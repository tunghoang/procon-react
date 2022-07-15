import './App.css';
import {useRoutes, usePath } from 'hookrouter';
import React from 'react';
import {useEffect, useState, useContext } from 'react';
import Tournaments from './pages/tournaments.js';
import Teams from './pages/teams.js';
import Login from './pages/login.js';

import Context from './context';

import { IntlProvider } from 'react-intl';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { ConfirmProvider } from 'material-ui-confirm';

import themeFn from './theme';

import viVN from './lang/vi.json';
import enUS from './lang/en.json';
const routes = {
  '/': () => ({
    component: Teams, 
    props: {}
  }),
  '/login': () => ({component: Login, props: {}}),
  '/tournaments': () => ({component: Tournaments, props: {}})
}


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
  const [idTournament, setIdTournament] = useState(null);
  const [tournamentName, setTournamentName] = useState(null);
  const [title, setTitle] = useState(null);
  useEffect(() => {
    if (!token) {
      setToken(window.localStorage.getItem('token'));
    }
  }, [token]);

  return (
    <Context.Provider value={{
      token,
      locale:'vi-VN',
      username: "Peter Parker",
      idTournament: idTournament,
      tournamentName: tournamentName,
      title: title,
      updateContext: ({token, idTournament, tournamentName, title}) => {
        if (token !== undefined) {
          if (token) localStorage.setItem('token', token);
          else localStorage.removeItem('token');
          setToken(token);
        }
        if (idTournament !== undefined) setIdTournament(idTournament);
        if (tournamentName !== undefined) setTournamentName(tournamentName);
        if (title !== undefined) setTitle(title);
      }
    }}>
      <AppInternal />
    </Context.Provider>
  )
}
function AppInternal() {
  const {token, locale, username, isAdmin, idTournament} = useContext(Context);
  let match = useRoutes(routes);
  usePath();
  let getLayout = match.component.getLayout ?? ((page) => page);

  return (
    <IntlProvider locale={locale} messages={loadMessages(locale)} >
      <ThemeProvider theme={themeFn(locale)}>
        <ConfirmProvider>
          <CssBaseline />
          { token ? ( idTournament ? getLayout(React.createElement(match.component, match.props)) : <Tournaments />) : <Login /> }
        </ConfirmProvider>
      </ThemeProvider>
    </IntlProvider>
  );
}

export default App;
