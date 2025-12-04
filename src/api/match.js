import { useConfirm } from "material-ui-confirm";
import { doDelete, doPost, getError, showMessage } from "./commons";

const SERVICE_API = import.meta.env.VITE_SERVICE_API;
const MATCH_URL = SERVICE_API + "/match";

export const apiDeleteTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doDelete(`${MATCH_URL}/${idMatch}/team/${idTeam}`);
    showMessage(`Team was sucessfully removed from match.`, "success");
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
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
    showMessage(getError(e), "error");
  }
};

// Bulk add teams to matches
// matchIds: number[], teamIds: number[]
export const apiBulkAddTeams = async (matchIds, teamIds) => {
  try {
    const result = await doPost(`${MATCH_URL}/bulk-add-teams`, null, {
      match_ids: matchIds,
      team_ids: teamIds,
    });
    showMessage(
      `Successfully added ${result.added_count} team-match relationships.`,
      "success"
    );
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
  }
  return false;
};

// Bulk remove teams from matches
// matchIds: number[], teamIds: number[]
export const apiBulkRemoveTeams = async (matchIds, teamIds) => {
  try {
    const result = await doPost(`${MATCH_URL}/bulk-remove-teams`, null, {
      match_ids: matchIds,
      team_ids: teamIds,
    });
    showMessage(`Successfully removed teams from matches.`, "success");
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
  }
  return false;
};