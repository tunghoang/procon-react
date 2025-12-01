const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short", // e.g., "Dec"
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh"
    })
    .replace(",", "");
};

const shortFormatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh"
    });
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

const roundNumber = (number) => {
  if (isNaN(number)) return "NA";
  return Math.round(number * 100) / 100;
};

export { copyText, formatDateTime, roundNumber, setLocalStorage, shortFormatDateTime };

