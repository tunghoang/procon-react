import { PREFIX, doGet, doPost, doPut, doDelete, showMessage } from "./commons";
import { useConfirm } from "material-ui-confirm";

export const useApi = (pathName, apiName) => {
  const URL = PREFIX + pathName;
  const apiGetAll = async () => {
    try {
      const results = await doGet(URL);
      showMessage(`Get ${apiName} succeeded`, "success", 1000);
      return results;
    } catch (e) {
      console.log(e);
      showMessage(`Get ${apiName} error: ${e.message}`, "error");
    }
    return false;
  };
  const apiDelete = async (id) => {
    try {
      const results = await doDelete(`${URL}/${id}`);
      showMessage(`Delete ${apiName} succeeded`, "success", 1000);
      return results;
    } catch (e) {
      showMessage(`Delete ${apiName} error: ${e.message}`, "error");
    }
    return false;
  };
  const useConfirmDelete = () => {
    const confirm = useConfirm();
    return async (id) => {
      try {
        await confirm({ description: "Are you sure?" });
        return apiDelete(id);
      } catch (e) {
        return false;
      }
    };
  };
  const apiCreate = async (payload) => {
    try {
      const result = await doPost(URL, null, payload);
      showMessage(`Success create new ${apiName}`, "success", 1000);
      return result;
    } catch (e) {
      showMessage(`Error creating new ${apiName}: ${e.message}`, "error");
    }
  };
  const apiEdit = async (id, payload) => {
    try {
      const result = await doPut(`${URL}/${id}`, null, payload);
      showMessage(`Success edit ${apiName} ${id}`, "success", 1000);
      return result;
    } catch (e) {
      showMessage(`Error edit ${apiName}: ${e.message}`, "error");
    }
  };

  return { apiGetAll, apiCreate, apiEdit, apiDelete, useConfirmDelete };
};
