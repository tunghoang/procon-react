import axios from "axios";
import Toastify from "toastify-js";

let routerInstance = null;
let isRedirecting = false;

export const setRouter = (router) => {
  routerInstance = router;
};

export const getError = (e) => {
  return e.response?.data?.message || e.message;
};

const createAPI = () => {
  const api = axios.create();

  api.interceptors.request.use(async (config) => {
    const accessToken = localStorage.getItem("token");

    if (accessToken && config.headers)
      config.headers.Authorization = accessToken;

    return config;
  });

  api.interceptors.response.use(
    (response) => {
      return response.data;
    },
    (error) => {
      if (
        error.response?.status === 401 &&
        error.response?.statusText === "Unauthorized"
      ) {
        localStorage.removeItem("token");

        // Redirect to login with callback URL (only once)
        if (routerInstance && window.location.pathname !== "/login" && !isRedirecting) {
          isRedirecting = true;
          const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
          routerInstance.navigate({
            to: "/login",
            search: { redirect: callbackUrl }
          });

          // Reset flag after navigation completes
          setTimeout(() => {
            isRedirecting = false;
          }, 1000);
        } else {
          // Suppress error notification for subsequent 401 errors when already redirecting
          error.handled = true;
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
};

export const api = createAPI();

export const doGet = async (route, headers, config) => {
  try {
    return (await api.get(route, { headers, ...config })).data;
  } catch (e) {
    throw e;
  }
};
export const doDelete = async (route, headers) => {
  try {
    return await api.delete(route, { headers });
  } catch (e) {
    throw e;
  }
};
export const doPost = async (route, headers, payload) => {
  try {
    return await api.post(route, payload, { headers });
  } catch (e) {
    throw e;
  }
};
export const doPut = async (route, headers, payload) => {
  try {
    return await api.put(route, payload, { headers });
  } catch (e) {
    throw e;
  }
};
export function showMessage(msg, severity, duration = 2000) {
  let t = Toastify({
    text: msg,
    duration: duration * 2 || 5000,
    close: false,
    gravity: "bottom",
    position: "left",
    stopOnFocus: true,
    className: severity || "info",
    onClick: function () {
      t.hideToast();
    },
  });
  t.showToast();
}
