const runtimeConfig = (() => {
  if (typeof window === "undefined") {
    return {};
  }
  return window.__RUNTIME_CONFIG__ || {};
})();

const getEnv = (key, fallback = "") => {
  const runtimeValue = runtimeConfig[key];
  if (runtimeValue !== undefined) return runtimeValue;

  const metaValue = import.meta.env?.[key];
  if (metaValue !== undefined) return metaValue;

  return fallback;
};

export const SERVICE_API = getEnv("VITE_SERVICE_API", "");

