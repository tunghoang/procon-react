import { doPost, showMessage, getError } from "./commons";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;
const SIGNIN_URL = SERVICE_API + "/team/signin";
const SIGNUP_URL = SERVICE_API + "/team/signup";

export const apiSignIn = async (payload, headers) => {
  try {
    const result = await doPost(SIGNIN_URL, headers, payload);
    showMessage("Sign in succeeded", "success", 1000);
    return result;
  } catch (e) {
    console.log(e);
    showMessage(`Sign in error: ${getError(e)}`, "error");
  }
  return false;
};
export const apiSignUp = async (payload, headers) => {
  try {
    const results = await doPost(SIGNUP_URL, headers, payload);
    showMessage("Sign up succeeded", "success", 1000);
    return results;
  } catch (e) {
    showMessage(`Sign up error: ${getError(e)}`, "error");
  }
  return false;
};
