import { doPost, showMessage, getError } from "./commons";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;
const SIGNIN_URL = SERVICE_API + "/team/signin";
const SIGNUP_URL = SERVICE_API + "/team/signup";

export const apiSignIn = async (payload, headers) => {
  try {
    const result = await doPost(SIGNIN_URL, headers, payload);
    showMessage("Login Success", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Login Error: ${getError(e)}`, "error");
  }
  return false;
};
export const apiSignUp = async (payload, headers) => {
  try {
    const results = await doPost(SIGNUP_URL, headers, payload);
    showMessage("Signup Success", "success", 1000);
    return results;
  } catch (e) {
    showMessage(`Signup Error: ${getError(e)}`, "error");
  }
  return false;
};
