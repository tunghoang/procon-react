const isDebugMode = import.meta.env.VITE_DEBUG === 'true';

export const debugLog = (...args) => {
  if (isDebugMode) {
    console.log(...args);
  }
};

export const debugWarn = (...args) => {
  if (isDebugMode) {
    console.warn(...args);
  }
};

export const debugError = (...args) => {
  if (isDebugMode) {
    console.error(...args);
  }
};

export const debugTable = (...args) => {
  if (isDebugMode) {
    console.table(...args);
  }
};
