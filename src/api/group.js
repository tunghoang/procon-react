import { doDelete, doGet, doPost, getError, showMessage } from "./commons";
import { SERVICE_API } from "../config/env";

// Groups (schools) on the team-manager: /group, /group/:id/members,
// /group/:id/candidates. Every call is scoped server-side -- a manager only
// ever gets its own group back, whatever id it asks for.
const GROUP_URL = SERVICE_API + "/group";

/** Members of a group: [{id, name, account, group_role, is_admin}]. */
export const apiGroupMembers = async (groupId) => {
	try {
		const result = await doGet(`${GROUP_URL}/${groupId}/members`);
		return result?.data || [];
	} catch (e) {
		if (!e.handled) showMessage(getError(e), "error");
		return [];
	}
};

/** Accounts that could be added to the group (ungrouped ones for a manager). */
export const apiGroupCandidates = async (groupId) => {
	try {
		const result = await doGet(`${GROUP_URL}/${groupId}/candidates`);
		return result?.data || [];
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
		showMessage(`Added ${result?.added_count ?? teamIds.length} account(s) to the group.`, "success");
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
		showMessage("Account removed from the group.", "success");
		return result;
	} catch (e) {
		showMessage(getError(e), "error", 6000);
	}
	return false;
};
