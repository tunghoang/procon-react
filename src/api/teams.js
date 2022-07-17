import { PREFIX, doGet, doPost, doPut, doDelete, showMessage } from "./commons";
import { useConfirm } from "material-ui-confirm";
import { mockTeams } from "./mock";

const isMocking = false;

const TEAMS_URL = PREFIX + "/team";

export const apiGetTeams = async () => {
  let mockResponse = isMocking ? mockTeams : undefined;
  try {
    const results = await doGet(TEAMS_URL, null, mockResponse);
    showMessage("Get Teams succeeded", "success", 1000);
    return results;
  } catch (e) {
    console.log(e);
    showMessage(`Get teams error: ${e.message}`, "error");
  }
  return false;
};
export const apiDeleteTeam = async (idTeam) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const results = await doDelete(
      `${TEAMS_URL}/${idTeam}`,
      null,
      mockResponse
    );
    return results;
  } catch (e) {
    showMessage(`Delete team error: ${e.message}`, "error");
  }
  return false;
};
export const useConfirmDeleteTeam = () => {
  const confirm = useConfirm();
  return async (idTeam) => {
    try {
      await confirm({ description: "Are you sure?" });
      return apiDeleteTeam(idTeam);
    } catch (e) {
      return false;
    }
  };
};
export const apiNewTeam = async (school) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPost(TEAMS_URL, null, school, mockResponse);
    showMessage("Success create new school", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error creating new school: ${e.message}`, "error");
  }
};
export const apiEditTeam = async (idTeam, school) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPut(
      `${TEAMS_URL}/${idTeam}`,
      null,
      school,
      mockResponse
    );
    showMessage("Success edit school " + idTeam, "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error edit school: ${e.message}`, "error");
  }
};
