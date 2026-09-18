import { useConfirm } from "material-ui-confirm";
import { doDelete, doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";
import { t } from "../i18n";
const MATCH_URL = SERVICE_API + "/match";

export const apiDeleteTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doDelete(`${MATCH_URL}/${idMatch}/team/${idTeam}`);
    showMessage(t("match.teamRemoved"), "success");
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
      await confirm({ title: t("confirm.deleteTitle") });
      return apiDeleteTeamMatch(idMatch, idTeam);
    } catch (e) {
      return false;
    }
  };
};
export const apiNewTeamMatch = async (idMatch, idTeam) => {
  try {
    const result = await doPost(`${MATCH_URL}/${idMatch}/team/${idTeam}`, null);
    showMessage(t("match.teamAdded"), "success", 1000);
    return result;
  } catch (e) {
    showMessage(getError(e), "error");
  }
};

/**
 * Turn the roster-sync report the manager returns into a human list.
 *
 * `game_sync` is one entry per engine game touched: `{ok, game_id, reason}`.
 * A 502 means the rows WERE written but some engine games could not be
 * updated -- the caller must still refetch, and the admin needs to know which
 * games to retry rather than a bare "failed".
 */
const failedSync = (payload) =>
  (payload?.game_sync || []).filter((entry) => entry && !entry.ok);

const describeFailures = (failures) =>
  failures
    .map((f) => `${f.game_id ?? f.id ?? "?"}${f.reason ? `: ${f.reason}` : ""}`)
    .join("; ");

/**
 * Staff accounts the backend filtered out of a bulk add.
 *
 * A superadmin's or group manager's token administers a game rather than
 * playing it, so the manager skips those rows instead of failing the whole
 * batch (`skipped_staff: [{id, name}]`). The UI already keeps them out of the
 * pickers, but an older tab -- or a "select all" against a stale list -- can
 * still send one, and silently adding fewer teams than were selected is
 * exactly the kind of surprise that costs a match.
 */
const announceSkippedStaff = (payload) => {
  const skipped = payload?.skipped_staff || [];
  if (!skipped.length) return;
  showMessage(
    t("match.skippedStaff", {
      count: skipped.length,
      names: skipped.map((s) => s.name ?? s.id).join(", "),
    }),
    "warning",
    7000
  );
};

// Bulk add teams to matches
// matchIds: number[], teamIds: number[]
// Resolves to the server payload (with `partial: true` when the engine sync
// only partly succeeded) or false when nothing was written.
export const apiBulkAddTeams = async (matchIds, teamIds) => {
  try {
    const result = await doPost(`${MATCH_URL}/bulk-add-teams`, null, {
      match_ids: matchIds,
      team_ids: teamIds,
    });
    showMessage(
      t("match.teamsAdded", { count: result.added_count }),
      "success"
    );
    announceSkippedStaff(result);
    return result;
  } catch (e) {
    // 502: the team-match rows are committed, only the engine-side roster sync
    // failed. Report it as a partial success so the page still refetches and
    // shows the real state instead of pretending nothing happened.
    const data = e.response?.data;
    if (e.response?.status === 502) {
      const failures = failedSync(data);
      showMessage(
        t("match.syncPartial", {
          count: failures.length,
          // `failed_game_ids` is the manager's own list of what to retry; fall
          // back to deriving it from game_sync for an older deployment.
          games: data?.failed_game_ids?.length
            ? data.failed_game_ids.join(", ")
            : describeFailures(failures),
        }),
        "warning",
        8000
      );
      announceSkippedStaff(data);
      return { ...(data || {}), partial: true };
    }
    showMessage(getError(e), "error");
    // A 400 can still carry the staff list ("every selected account is
    // staff"), which says far more than the message alone.
    announceSkippedStaff(e.response?.data);
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
    showMessage(t("match.teamsRemoved"), "success");
    return result;
  } catch (e) {
    const data = e.response?.data;
    if (e.response?.status === 502) {
      const failures = failedSync(data);
      showMessage(
        t("match.syncPartial", {
          count: failures.length,
          games: describeFailures(failures),
        }),
        "warning",
        8000
      );
      return { ...(data || {}), partial: true };
    }
    showMessage(getError(e), "error");
  }
  return false;
};
