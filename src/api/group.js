import { doDelete, doGet, doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";
import { t } from "../i18n";

// Groups (schools) on the team-manager: /group, /group/:id/members,
// /group/:id/candidates. Every call is scoped server-side -- a manager only
// ever gets its own group back, whatever id it asks for.
const GROUP_URL = SERVICE_API + "/group";

/** Tolerate both an already-unwrapped array and a {count, data} envelope. */
const asList = (result) =>
	Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];

/** Members of a group: [{id, name, account, group_role, is_admin}]. */
export const apiGroupMembers = async (groupId) => {
	try {
		// doGet already unwraps the axios body AND the server's {count, data}
		// envelope (the response interceptor returns `.data`, doGet reads
		// `.data` again), so `result` IS the array. Reading `.data` a third
		// time made this dialog permanently empty.
		return asList(await doGet(`${GROUP_URL}/${groupId}/members`));
	} catch (e) {
		if (!e.handled) showMessage(getError(e), "error");
		return [];
	}
};

/** Accounts that could be added to the group (ungrouped ones for a manager). */
export const apiGroupCandidates = async (groupId) => {
	try {
		return asList(await doGet(`${GROUP_URL}/${groupId}/candidates`));
	} catch (e) {
		if (!e.handled) showMessage(getError(e), "error");
		return [];
	}
};

/** Pull accounts into the group. All-or-nothing on the server. */
export const apiGroupAddMembers = async (groupId, teamIds) => {
	try {
		const result = await doPost(`${GROUP_URL}/${groupId}/members`, null, {
			team_ids: teamIds,
		});
		showMessage(
			t("group.membersAdded", { count: result?.added_count ?? teamIds.length }),
			"success",
		);
		return result;
	} catch (e) {
		showMessage(getError(e), "error", 6000);
	}
	return false;
};

/** Drop one account back to "no group". */
export const apiGroupRemoveMember = async (groupId, teamId) => {
	try {
		const result = await doDelete(`${GROUP_URL}/${groupId}/members/${teamId}`);
		showMessage(t("group.memberRemoved"), "success");
		return result;
	} catch (e) {
		showMessage(getError(e), "error", 6000);
	}
	return false;
};
