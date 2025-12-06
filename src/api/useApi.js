import { useConfirm } from "material-ui-confirm";
import { useCallback } from "react";
import {
  doDelete,
  doGet,
  doPost,
  doPut,
  getError,
  showMessage,
} from "./commons";

import { SERVICE_API } from "../config/env";

export const useApi = (pathName, apiName) => {
  const URL = SERVICE_API + pathName;
  const apiGetAll = useCallback(
    async (config, headers) => {
      try {
        const results = await doGet(URL, headers, config);
        return results;
      } catch (e) {
        if (!e.handled) showMessage(getError(e), "error");
      }
      return false;
    },
    [URL, apiName]
  );
  const apiDelete = useCallback(
    async (id, headers) => {
      try {
        const results = await doDelete(`${URL}/${id}`, headers);
        showMessage(`${apiName} was successfully deleted.`, "success", 1000);
        return results;
      } catch (e) {
        if (!e.handled) showMessage(getError(e), "error");
      }
      return false;
    },
    [URL, apiName]
  );

  const useConfirmDelete = (headers) => {
    const confirm = useConfirm();
    return async (ids) => {
      try {
        await confirm({ title: "Are you sure want to delete?" });
        return Promise.all(ids.map(async (id) => await apiDelete(id, headers)));
      } catch (e) {
        return false;
      }
    };
  };
  const apiCreate = useCallback(
    async (payload, headers) => {
      try {
        const result = await doPost(URL, headers, payload);
        showMessage(`${apiName} was sucessfully created.`, "success", 1000);
        return result;
      } catch (e) {
        if (!e.handled) showMessage(getError(e), "error");
      }
    },
    [URL, apiName]
  );
  const apiEdit = useCallback(
    async (id, payload, headers) => {
      try {
        const result = await doPut(`${URL}/${id}`, headers, payload);
        showMessage(`Success Edit ${apiName}`, "success", 1000);
        return result;
      } catch (e) {
        if (!e.handled) showMessage(`Error Edit ${apiName}: ${getError(e)}`, "error");
      }
    },
    [URL, apiName]
  );

  return { apiGetAll, apiCreate, apiEdit, apiDelete, useConfirmDelete };
};
