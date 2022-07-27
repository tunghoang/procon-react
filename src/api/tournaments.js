import { PREFIX, doGet, doPost, doPut, doDelete, showMessage } from "./commons";
import { useConfirm } from "material-ui-confirm";
import { mockTournaments } from "./mock";

const isMocking = false;

const TOURNAMENTS_URL = PREFIX + "/tournament";

export const apiGetTournaments = async () => {
  let mockResponse = isMocking ? mockTournaments : undefined;
  try {
    const results = await doGet(TOURNAMENTS_URL, null, mockResponse);
    // showMessage("Get Tournaments succeeded", "success", 1000);
    return results;
  } catch (e) {
    console.log(e);
    showMessage(`Get tournaments error: ${e.message}`, "error");
  }
  return false;
};
export const apiDeleteTournament = async (idTournament) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const results = await doDelete(
      `${TOURNAMENTS_URL}/${idTournament}`,
      null,
      mockResponse
    );
    showMessage("Delete tournament succeeded", "success", 1000);
    return results;
  } catch (e) {
    showMessage(`Delete tournament error: ${e.message}`, "error");
  }
  return false;
};
export const useConfirmDeleteTournament = () => {
  const confirm = useConfirm();
  return async (idTournament) => {
    try {
      await confirm({ description: "Are you sure?" });
      return apiDeleteTournament(idTournament);
    } catch (e) {
      return false;
    }
  };
};
export const apiNewTournament = async (tournament) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPost(
      TOURNAMENTS_URL,
      null,
      tournament,
      mockResponse
    );
    showMessage("Success create new tournament", "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error creating new tournament: ${e.message}`, "error");
  }
};
export const apiEditTournament = async (idTournament, tournament) => {
  let mockResponse = isMocking ? { success: true } : undefined;
  try {
    const result = await doPut(
      `${TOURNAMENTS_URL}/${idTournament}`,
      null,
      tournament,
      mockResponse
    );
    showMessage("Success edit " + tournament.name, "success", 1000);
    return result;
  } catch (e) {
    showMessage(`Error edit tournament: ${e.message}`, "error");
  }
};
