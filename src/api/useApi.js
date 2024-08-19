import {
  doGet,
  doPost,
  doPut,
  doDelete,
  showMessage,
  getError,
} from "./commons";
import { useConfirm } from "material-ui-confirm";
import { useCallback } from "react";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;

export const useApi = (pathName, apiName) => {
  const URL = SERVICE_API + pathName;
  const apiGetAll = useCallback(
    async (config, headers) => {
      try {
        const results = await doGet(URL, headers, config);
        return results;
      } catch (e) {
        showMessage(`Get ${apiName} error: ${getError(e)}`, "error");
      }
      return false;
    },
    [URL, apiName]
  );
  const apiDelete = useCallback(
    async (id, headers) => {
      try {
        const results = await doDelete(`${URL}/${id}`, headers);
        showMessage(`Delete ${apiName} succeeded`, "success", 1000);
        return results;
      } catch (e) {
        showMessage(`Delete ${apiName} error: ${getError(e)}`, "error");
      }
      return false;
    },
    [URL, apiName]
  );

  const useConfirmDelete = (headers) => {
    const confirm = useConfirm();
    return async (id) => {
      try {
        await confirm({ description: "Are you sure?" });
        return apiDelete(id, headers);
      } catch (e) {
        return false;
      }
    };
  };
  const apiCreate = useCallback(
    async (payload, headers) => {
      try {
        const result = await doPost(URL, headers, payload);
        showMessage(`Success create new ${apiName}`, "success", 1000);
        return result;
      } catch (e) {
        showMessage(`Error creating new ${apiName}: ${getError(e)}`, "error");
      }
    },
    [URL, apiName]
  );
  const apiEdit = useCallback(
    async (id, payload, headers) => {
      try {
        const result = await doPut(`${URL}/${id}`, headers, payload);
        showMessage(`Success edit ${apiName}`, "success", 1000);
        return result;
      } catch (e) {
        showMessage(`Error edit ${apiName}: ${getError(e)}`, "error");
      }
    },
    [URL, apiName]
  );

  return { apiGetAll, apiCreate, apiEdit, apiDelete, useConfirmDelete };
};
