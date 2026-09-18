import { doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";
import { t } from "../i18n";
const SIGNIN_URL = SERVICE_API + "/team/signin";
const SIGNUP_URL = SERVICE_API + "/team/signup";

export const apiSignIn = async (payload, headers) => {
  try {
    const result = await doPost(SIGNIN_URL, headers, payload);
    showMessage(t("login.success"), "success", 1000);
    return result;
  } catch (e) {
    // A rejected sign-in is a single 401 "Invalid credentials" for both an
    // unknown account and a wrong password (no account enumeration), so show
    // the server's own message and let the form stay put -- the 401
    // auto-logout in commons.js deliberately skips this URL.
    showMessage(t("login.failed", { error: getError(e) }), "error");
    return e;
  }
};
export const apiSignUp = async (payload, headers) => {
  try {
    const results = await doPost(SIGNUP_URL, headers, payload);
    showMessage(t("signup.success"), "success", 1000);
    return results;
  } catch (e) {
    showMessage(t("signup.failed", { error: getError(e) }), "error");
  }
  return false;
};
