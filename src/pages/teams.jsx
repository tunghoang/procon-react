import { Paper, Chip, Box, Typography } from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { useIntl } from "react-intl";
import { useContext, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useApi, useFetchData } from "../api";
import TeamDialog from "../dialogs/team";
import { GroupMembersDialog } from "../dialogs/group";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import TeamPasswordDialog from "../dialogs/password";
import Context from "../context";
import { isManager, isSuperAdmin, managerGroupId } from "../utils/roles";

/**
 * Accounts. Two audiences:
 *   superadmin     every account; create/edit/delete, roles, group assignment.
 *   group manager  its own group's members (the backend returns only those);
 *                  it may pull UNGROUPED accounts into the group and drop
 *                  members out, nothing else -- accounts are created by the
 *                  organiser.
 */
const Teams = () => {
	const { formatMessage: tr } = useIntl();
	const { team: me } = useContext(Context);
	const superadmin = isSuperAdmin(me);
	const manager = isManager(me);
	const [selectedTeamIds, setSelectedTeamIds] = useState([]);
	const search = useSearch({ strict: false });
	const { apiCreate, apiEdit, useConfirmDelete } = useApi("/team", "Team");
	const apiDeleteTeam = useConfirmDelete();
	const {
		data: teams,
		refetch,
		loading,
	} = useFetchData({
		path: "/team",
		name: "Team",
		config: {
			params: {
				round_id: search?.round_id,
			},
		},
	});

	// Predefined colors for chips based on match id
	const chipColors = [
		{ bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" }, // violet
		{ bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" }, // blue
		{ bg: "#dcfce7", color: "#15803d", border: "#86efac" }, // green
		{ bg: "#fef3c7", color: "#b45309", border: "#fcd34d" }, // amber
		{ bg: "#ffe4e6", color: "#be123c", border: "#fda4af" }, // rose
		{ bg: "#e0e7ff", color: "#4338ca", border: "#a5b4fc" }, // indigo
		{ bg: "#ccfbf1", color: "#0f766e", border: "#5eead4" }, // teal
		{ bg: "#fce7f3", color: "#a21caf", border: "#f0abfc" }, // fuchsia
		{ bg: "#fed7aa", color: "#c2410c", border: "#fdba74" }, // orange
		{ bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" }, // sky
	];

	const getChipColor = (id) => {
		return chipColors[id % chipColors.length];
	};

	const roleLabel = (row) => {
		if (row.is_admin) return tr({ id: "role.admin" });
		if (row.group_role === "manager") return tr({ id: "role.manager" });
		return tr({ id: "role.user" });
	};

	const columns = [
		{
			field: "id",
			headerName: "ID",
			width: 100,
			headerClassName: "tableHeader",
		},
		{
			field: "name",
			headerName: "Name",
			flex: 1,
			headerClassName: "tableHeader",
		},
		{
			field: "account",
			headerName: "Account",
			flex: 1,
			headerClassName: "tableHeader",
		},
		{
			field: "is_admin",
			headerName: "Role",
			flex: 0.8,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => (
				<Chip
					size="small"
					label={roleLabel(row)}
					color={row.is_admin ? "error" : row.group_role === "manager" ? "secondary" : "default"}
					variant={row.is_admin || row.group_role === "manager" ? "filled" : "outlined"}
				/>
			),
			valueGetter: (params) => roleLabel(params.row),
		},
		// Which school the account belongs to. Hidden for a manager: every row
		// it sees is its own group by construction.
		...(superadmin
			? [
					{
						field: "group",
						headerName: tr({ id: "group.field" }),
						flex: 0.8,
						headerClassName: "tableHeader",
						renderCell: ({ row }) =>
							row.group ? (
								<Chip size="small" variant="outlined" color="secondary" label={row.group.name} />
							) : (
								<Typography variant="caption" color="text.disabled">
									{tr({ id: "group.none" })}
								</Typography>
							),
						valueGetter: (params) => params.row.group?.name || "",
					},
				]
			: []),
		{
			field: "Matches",
			headerName: "Matches",
			flex: 2,
			headerClassName: "tableHeader",
			renderCell: (params) => (
				<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", py: 0.5 }}>
					{params.row.Matches?.map((match) => {
						const chipColor = getChipColor(match.id);
						return (
							<Chip
								key={match.id}
								label={match.name}
								size="small"
								sx={{
									fontWeight: 500,
									fontSize: "0.75rem",
									backgroundColor: chipColor.bg,
									color: chipColor.color,
									borderColor: chipColor.border,
									"&:hover": {
										backgroundColor: chipColor.border,
									},
								}}
								variant="outlined"
							/>
						);
					})}
				</Box>
			),
			valueGetter: (params) => {
				return params.row.Matches?.map((match) => match.name);
			},
		},
	];
	const [dialogName, setDialogName] = useState("");
	const [currentTeam, setCurrentTeam] = useState({});

	const clickNew = () => {
		setCurrentTeam({
			name: "",
			account: "",
			is_admin: false,
			group_id: null,
			group_role: "member",
			password: "",
		});
		setDialogName("TeamDialog");
	};
	const openDialog = (name) => {
		const selectedTeam = teams.find(
			(c) => c.id === parseInt(selectedTeamIds[0])
		);
		if (name === "TeamPasswordDialog") selectedTeam.password = "";
		else delete selectedTeam.password;
		setCurrentTeam(selectedTeam);
		setDialogName(name);
	};
	const closeDialog = () => {
		setDialogName("");
	};
	const clickDelete = async () => {
		const result = await apiDeleteTeam(selectedTeamIds);
		if (result.length) await refetch();
	};
	const saveInstance = async () => {
		// Only the account's own columns -- not the nested group/Matches the
		// list row carries.
		const payload = {
			name: currentTeam.name,
			account: currentTeam.account,
			password: currentTeam.password,
			is_admin: !!currentTeam.is_admin,
			group_id: currentTeam.is_admin ? null : currentTeam.group_id ?? null,
			group_role: currentTeam.is_admin ? "member" : currentTeam.group_role || "member",
		};
		let result;
		if (currentTeam.id) {
			result = await apiEdit(currentTeam.id, payload);
		} else {
			result = await apiCreate(payload);
		}
		if (result) await refetch();
		setDialogName("");
	};
	const changeInstance = (changes) => {
		setCurrentTeam({ ...currentTeam, ...changes });
	};

	// The manager's own group, for the membership dialog. The list endpoint
	// already returns only this group's rows, so its name is on any of them.
	const myGroup = manager
		? { id: managerGroupId(me), name: teams.find((t) => t.group)?.group?.name || me?.name }
		: null;

	return (
		<>
			<PageToolbar
				title={manager ? tr({ id: "group.myMembers" }) : tr({ id: "Teams" })}
				showNew={superadmin}
				showEdit={superadmin && (selectedTeamIds || []).length === 1}
				showDelete={superadmin && (selectedTeamIds || []).length}
				handleNew={clickNew}
				editBtns={[
					{
						label: "Edit",
						fn: () => openDialog("TeamDialog"),
					},
					{
						label: "Change Password",
						fn: () => openDialog("TeamPasswordDialog"),
					},
				]}
				handleDelete={clickDelete}
				customBtns={
					manager
						? [
								{
									label: tr({ id: "group.manageMembers" }),
									fn: () => setDialogName("GroupMembersDialog"),
									color: "primary",
									icon: <GroupAddIcon />,
								},
							]
						: []
				}
			/>
			<Paper
				component="main"
				sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				<DataTable
					rows={teams}
					onFilter={async (params) => await refetch(params)}
					columns={columns}
					onSelectionModelChange={(ids) => {
						setSelectedTeamIds(ids);
					}}
					loading={loading}
					onRefresh={refetch}
				/>
			</Paper>
			<TeamDialog
				open={dialogName === "TeamDialog"}
				instance={currentTeam}
				close={closeDialog}
				save={saveInstance}
				handleChange={changeInstance}
			/>
			<TeamPasswordDialog
				open={dialogName === "TeamPasswordDialog"}
				instance={currentTeam}
				close={closeDialog}
				save={saveInstance}
				handleChange={changeInstance}
			/>
			{manager && (
				<GroupMembersDialog
					open={dialogName === "GroupMembersDialog"}
					group={myGroup}
					selfId={me?.id}
					close={closeDialog}
					onChanged={refetch}
				/>
			)}
		</>
	);
};

Teams.wName = "Teams";

export default Teams;
