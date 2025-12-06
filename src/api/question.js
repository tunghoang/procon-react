import { doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";
const QUESTION_URL = SERVICE_API + "/question";

// Bulk delete questions
// questionIds: number[]
export const apiBulkDeleteQuestions = async (questionIds) => {
  try {
    const result = await doPost(`${QUESTION_URL}/bulk-delete`, null, {
      question_ids: questionIds,
    });
    showMessage(
      `Successfully deleted ${result.deleted_count} question(s).`,
      "success"
    );
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
  }
  return false;
};

