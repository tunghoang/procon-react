const formatDateTime = (datetime) => {
  return new Date(datetime).toLocaleString();
};

const setLocalStorage = (item, name) => {
  if (item) localStorage.setItem(name, item);
  else localStorage.removeItem(name);
};

export { formatDateTime, setLocalStorage };
