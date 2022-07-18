import { createContext } from "react";
const Context = createContext({
  token: null,
  locale: null,
  teamname: null,
  isAdmin: false,
  tournament: null,
  round: null,
  updateContext: (info) => {},
  updateLocalStorage: (info) => {},
});
export default Context;
