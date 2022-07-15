import { createContext, useContext } from 'react';
const Context = createContext({
  token: null,
  locale: null,
  username: 'Peter',
  isAdmin: true,
  idSchool: null,
  schoolName: null,
  title: null,
  updateContext: (info) => {}
});
export default Context;

export const useTitle = (title) => {
  const { updateContext } = useContext(Context);
  updateContext({title});
}
