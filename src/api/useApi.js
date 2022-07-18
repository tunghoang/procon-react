import { PREFIX, doGet, doPost, doPut, doDelete, showMessage } from "./commons";
import { useConfirm } from "material-ui-confirm";
import { useCallback } from "react";

export const useApi = (pathName, apiName) => {
  const URL = PREFIX + pathName;
  const apiGetAll = useCallback(
    async (config, headers) => {
      try {
        const results = await doGet(URL, headers, null, config);
        // showMessage(`Get ${apiName} succeeded`, "success", 1000);
        return results;
      } catch (e) {
        console.log(e);
        showMessage(`Get ${apiName} error: ${e.message}`, "error");
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
        showMessage(`Delete ${apiName} error: ${e.message}`, "error");
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
        showMessage(`Error creating new ${apiName}: ${e.message}`, "error");
      }
    },
    [URL, apiName]
  );
  const apiEdit = useCallback(
    async (id, payload, headers) => {
      try {
        const result = await doPut(`${URL}/${id}`, headers, payload);
        showMessage(`Success edit ${apiName} ${id}`, "success", 1000);
        return result;
      } catch (e) {
        showMessage(`Error edit ${apiName}: ${e.message}`, "error");
      }
    },
    [URL, apiName]
  );

  return { apiGetAll, apiCreate, apiEdit, apiDelete, useConfirmDelete };
};
