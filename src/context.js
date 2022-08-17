import { createContext } from "react";
const Context = createContext({
  token: null,
  locale: null,
  team: null,
  isAdmin: false,
  tournament: null,
  round: null,
  userMatch: null,
  updateContext: (info) => {},
  updateLocalStorage: (info) => {},
});
export default Context;
