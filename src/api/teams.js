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
export const apiNewTeam = async (team) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPost(TEAMS_URL, null, team, mockResponse);
    showMessage("Success create new team", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error creating new team: ${e.message}`, "error");
  }
};
export const apiEditTeam = async (idTeam, team) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPut(
      `${TEAMS_URL}/${idTeam}`,
      null,
      team,
      mockResponse
    );
    showMessage("Success edit team " + idTeam, "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error edit team: ${e.message}`, "error");
  }
};
