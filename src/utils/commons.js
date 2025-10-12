const formatDateTime = (datetime) => {
  return new Date(datetime).toLocaleString();
};

const setLocalStorage = (item, name) => {
  if (item) localStorage.setItem(name, item);
  else localStorage.removeItem(name);
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.log(text);
    return false;
  }
};

export { formatDateTime, setLocalStorage, copyText };
