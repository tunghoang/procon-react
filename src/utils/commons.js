const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short", // e.g., "Dec"
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    })
    .replace(",", "");
};

const shortFormatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
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
  } catch {
    try {
      window.prompt("Copy this text (Ctrl+C, Enter):", text);
      return true;
    } catch {
      console.log("Copy this text (Ctrl+C):", text);
      return false;
    }
  }
};

const roundNumber = (number) => {
  if (isNaN(number)) return "NA";
  return Math.round(number * 100) / 100;
};

/**
 * Truncate a date to the whole minute.
 *
 * A <DateTimePicker> only exposes fields down to the minute, but it PRESERVES
 * the seconds of whatever value it was handed -- and those seconds are usually
 * stray: a `new Date()`/`Date.now() + 2min` default carries the current second,
 * and a match row whose start_time fell back to the model's NOW() default keeps
 * the second it was created at. Without this, a schedule an admin reads as
 * "14:30" really starts at 14:30:47, and every downstream deadline (agent-kind
 * window, each day's response deadline) inherits that offset.
 */
const withZeroSeconds = (date) => {
  if (!date) return null;
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
};

/**
 * Seconds remaining -> "mm:ss" (or "h:mm:ss" past an hour). Shared so the play
 * screen's clock and the agent-kind panel's "opens in ..." never disagree.
 */
const formatCountdown = (totalSeconds) => {
  const total = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
};

export {
  copyText,
  formatCountdown,
  formatDateTime,
  roundNumber,
  setLocalStorage,
  shortFormatDateTime,
  withZeroSeconds,
};
