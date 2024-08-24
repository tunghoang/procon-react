import { doPost, doDelete, showMessage, getError } from "./commons";
import { useConfirm } from "material-ui-confirm";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;
const MATCH_URL = SERVICE_API + "/match";

export const apiDeleteTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doDelete(`${MATCH_URL}/${idMatch}/team/${idTeam}`);
    showMessage(`Team was sucessfully removed from match.`, "success");
    return result;
  } catch (e) {
    showMessage(`Error: ${getError(e)}`, "error");
  }
  return false;
};
export const useConfirmDeleteTeamMatch = () => {
  const confirm = useConfirm();
  return async (idMatch, idTeam) => {
    try {
      await confirm({ title: "Are you sure want to delete?" });
      return apiDeleteTeamMatch(idMatch, idTeam);
    } catch (e) {
      return false;
    }
  };
};
export const apiNewTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doPost(`${MATCH_URL}/${idMatch}/team/${idTeam}`, null);
    showMessage("Team was successfully added.", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error: ${getError(e)}`, "error");
  }
};
