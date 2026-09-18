import { api, doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";
import { t } from "../i18n";
const QUESTION_URL = SERVICE_API + "/question";

// Bulk delete questions
// questionIds: number[]
export const apiBulkDeleteQuestions = async (questionIds) => {
  try {
    const result = await doPost(`${QUESTION_URL}/bulk-delete`, null, {
      question_ids: questionIds,
    });
    showMessage(
      t("questions.bulkDeleted", { count: result.deleted_count }),
      "success"
    );
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
  }
  return false;
};

/**
 * Manual reset of a question, through the TEAM MANAGER (never the engine).
 *
 * `POST /question/:id/reset` with an optional `{startsAt}` (epoch seconds).
 * The manager knows whether the question is one shared game or N per-team
 * practice games and fans the engine's `/game/reset` out itself, which is what
 * keeps the browser off the engine's per-token read budget (a 12-team roster
 * used to burst 12 resets and come back "10/12").
 *
 * Answers `{ok, startsAt, reset: [ids], failed: [{id, reason}]}` with 200 when
 * everything reset and 502 when only part of it did -- so the 502 body is a
 * RESULT, not just an error, and is returned rather than swallowed.
 *
 * `startsAt` must be at least `now + agent_selection_time_limit` or the server
 * answers 400 (a reset into an already-closed window defaults every team to
 * all-patrol).
 */
export const apiResetQuestion = async (questionId, startsAtSec) => {
  const body =
    startsAtSec === undefined || startsAtSec === null
      ? {}
      : { startsAt: startsAtSec };
  try {
    return await api.post(`${QUESTION_URL}/${questionId}/reset`, body);
  } catch (e) {
    const data = e.response?.data;
    // 502 = partial: some games reset, some did not. Hand the body back so the
    // caller can list what failed instead of showing a bare error.
    if (e.response?.status === 502 && data && Array.isArray(data.failed)) {
      return { ...data, ok: false };
    }
    throw e;
  }
};
