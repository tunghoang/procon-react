import { PREFIX, doPost, doDelete, showMessage } from "./commons";
import { useConfirm } from "material-ui-confirm";

const MATCH_URL = PREFIX + "/match";

export const apiDeleteTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doDelete(`${MATCH_URL}/${idMatch}/team/${idTeam}`);
    return result;
  } catch (e) {
    showMessage(`Delete team error: ${e.message}`, "error");
  }
  return false;
};
export const useConfirmDeleteTeamMatch = () => {
  const confirm = useConfirm();
  return async (idMatch, idTeam) => {
    try {
      await confirm({ description: "Are you sure?" });
      return apiDeleteTeamMatch(idMatch, idTeam);
    } catch (e) {
      return false;
    }
  };
};
export const apiNewTeamMatch = async (team) => {
  try {
    const result = await doPost(MATCH_URL, null, team);
    showMessage("Success create new school", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error creating new school: ${e.message}`, "error");
  }
};
