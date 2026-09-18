import axios from "axios";
import Toastify from "toastify-js";
import { buildRedirect, currentRedirect, parseRedirect } from "../utils/redirect";

let routerInstance = null;
let isRedirecting = false;

export const setRouter = (router) => {
  routerInstance = router;
};

export const getError = (e) => {
  return e.response?.data?.message || e.message;
};

/**
 * The event `redirectToLogin` fires so React can drop the session too.
 *
 * Clearing localStorage is not enough: App holds the token in state (and the
 * decoded team with it), and nothing was telling it to let go -- so after an
 * auto-logout the admin area still rendered its staff-only children from the
 * stale state, most visibly when the user pressed Back. A DOM event keeps this
 * module free of React imports while still reaching the one component that
 * owns the session.
 */
export const LOGOUT_EVENT = "hexudon:logout";

/**
 * Drop the session and bounce to /login, remembering where the user was.
 *
 * Shared by BOTH clients: the team-manager axios instance below and the game
 * service's own client (api/gameService.js). An expired token used to be
 * handled only here, so a 401 from the engine left the play screen polling an
 * error forever.
 *
 * The redirect target travels as `{to, search}` (see utils/redirect.js) -- a
 * `to` carrying "?x=y" is not a route and lands on the 404 page.
 */
export const redirectToLogin = () => {
  localStorage.removeItem("token");
  // Announce it even when the redirect below is skipped (already redirecting,
  // or already on /login): the point is that React stops believing the old
  // session, which is true in every one of those cases.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOGOUT_EVENT));
  }
  if (!routerInstance || isRedirecting) return false;
  if (window.location.pathname === "/login") return false;
  isRedirecting = true;
  routerInstance.navigate({
    to: "/login",
    search: { redirect: currentRedirect() },
  });
  // Reset flag after navigation completes
  setTimeout(() => {
    isRedirecting = false;
  }, 1000);
  return true;
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
      // statusText is unreliable (often empty over HTTP/2) — the status
      // code alone decides the auto-logout.
      //
      // Sign-in/sign-up are exempt: a rejected login now answers 401 ("Invalid
      // credentials") for both an unknown account and a wrong password, and
      // treating that as an expired session would wipe the form's own error
      // handling and re-navigate the page the user is already on.
      const isAuthAttempt = /\/team\/(signin|signup)(\?|$)/.test(
        error.config?.url || "",
      );
      if (error.response?.status === 401 && !isAuthAttempt) {
        if (!redirectToLogin()) {
          // Suppress error notification for subsequent 401 errors when already
          // redirecting (or when we are already sitting on /login).
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

// Re-exported so callers that already import from this module can build a
// login redirect without reaching for the util directly.
export { buildRedirect, parseRedirect };
