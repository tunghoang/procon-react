const runtimeConfig = (() => {
  if (typeof window === "undefined") {
    return {};
  }
  return window.__RUNTIME_CONFIG__ || {};
})();

export const getEnv = (key, fallback = "") => {
  const runtimeValue = runtimeConfig[key];
  if (runtimeValue !== undefined) return runtimeValue;

  const metaValue = import.meta.env?.[key];
  if (metaValue !== undefined) return metaValue;

  return fallback;
};

export const SERVICE_API = getEnv("VITE_SERVICE_API", "");

// HEXUDON game service (FastAPI). Includes the /api prefix, mirroring the
// team-manager's SERVICE_APIS entries, e.g. http://127.0.0.1:8001/api
export const GAME_SERVICE_API = getEnv("VITE_GAME_SERVICE_API", "");

