import { Paper, Chip, Box, Stack, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupsIcon from "@mui/icons-material/Groups";
import { useContext, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "@tanstack/react-router";
import { useApi, useFetchData } from "../api";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import Context from "../context";
import { GroupDialog, GroupMembersDialog } from "../dialogs/group";
import { isSuperAdmin } from "../utils/roles";

/**
 * Groups (schools) -- superadmin only. A group is a set of accounts that
 * belong together; one of them can be made that group's MANAGER (Teams page,
 * role "Manager"), who then runs matches for the group on its own. Membership
 * is assigned by hand here or by the manager (ungrouped accounts only).
 */
const Groups = () => {
	const { formatMessage: tr } = useIntl();
	const { team } = useContext(Context);
	const navigate = useNavigate();
	const [selectedIds, setSelectedIds] = useState([]);
	const [dialogName, setDialogName] = useState("");
	const [current, setCurrent] = useState({});
	const { apiCreate, apiEdit, useConfirmDelete } = useApi("/group", "Group");
	const apiDeleteGroup = useConfirmDelete();
	const {
		data: groups,
		refetch,
		loading,
	} = useFetchData({ path: "/group", name: "Group" });

	// Bounce a non-superadmin from an EFFECT, never from the render body:
	// navigating while rendering mutates the router mid-render, which React
	// warns about and which can leave the page half-mounted.
	const allowed = !team || isSuperAdmin(team);
	useEffect(() => {
		if (team && !isSuperAdmin(team)) {
			navigate({ to: "/forbidden", replace: true });
		}
	}, [team, navigate]);

	const columns = [
		{ field: "id", headerName: "ID", width: 80, headerClassName: "tableHeader" },
		{ field: "name", headerName: tr({ id: "name" }), flex: 1, headerClassName: "tableHeader" },
		{
			field: "description",
			headerName: tr({ id: "description" }),
			flex: 1.5,
			headerClassName: "tableHeader",
		},
		{
			field: "managers",
			headerName: tr({ id: "group.managers" }),
			flex: 1.5,
			headerClassName: "tableHeader",
			sortable: false,
			renderCell: ({ row }) =>
				row.managers?.length ? (
					<Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", py: 0.5 }}>
						{row.managers.map((m) => (
							<Chip key={m.id} size="small" color="secondary" label={m.name} />
						))}
					</Box>
				) : (
					<Typography variant="caption" color="error">
						{tr({ id: "group.noManager" })}
					</Typography>
				),
			valueGetter: (params) => params.row.managers?.map((m) => m.name).join(", "),
		},
		{
			field: "member_count",
			headerName: tr({ id: "group.memberCount" }),
			width: 120,
			headerClassName: "tableHeader",
		},
		{
			field: "match_count",
			headerName: tr({ id: "group.matchCount" }),
			width: 120,
			headerClassName: "tableHeader",
		},
		{
			field: "actions",
			headerName: tr({ id: "actions" }),
			width: 160,
			sortable: false,
			filterable: false,
			renderCell: ({ row }) => (
				<Stack direction="row" spacing={0.5}>
					<Tooltip title={tr({ id: "group.members" })}>
						<IconButton
							size="small"
							color="primary"
							onClick={() => {
								setCurrent(row);
								setDialogName("GroupMembersDialog");
							}}>
							<GroupsIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title={tr({ id: "Edit" })}>
						<IconButton
							size="small"
							color="primary"
							onClick={() => {
								setCurrent({ id: row.id, name: row.name, description: row.description });
								setDialogName("GroupDialog");
							}}>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title={tr({ id: "Delete" })}>
						<IconButton
							size="small"
							color="error"
							onClick={async () => {
								const result = await apiDeleteGroup([row.id]);
								if (result.length) await refetch();
							}}>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	];

	const saveInstance = async () => {
		const payload = { name: current.name, description: current.description };
		const result = current.id
			? await apiEdit(current.id, payload)
			: await apiCreate(payload);
		if (result) await refetch();
		setDialogName("");
	};

	if (!allowed) return null;

	return (
		<>
			<PageToolbar
				title={tr({ id: "Groups" })}
				showNew={true}
				showDelete={selectedIds.length}
				handleNew={() => {
					setCurrent({ name: "", description: "" });
					setDialogName("GroupDialog");
				}}
				handleDelete={async () => {
					const result = await apiDeleteGroup(selectedIds);
					if (result.length) await refetch();
				}}
			/>
			<Paper component="main" sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				<DataTable
					rows={groups}
					columns={columns}
					onSelectionModelChange={(ids) => setSelectedIds(ids)}
					loading={loading}
					onRefresh={refetch}
				/>
			</Paper>
			<GroupDialog
				open={dialogName === "GroupDialog"}
				instance={current}
				close={() => setDialogName("")}
				save={saveInstance}
				handleChange={(changes) => setCurrent({ ...current, ...changes })}
			/>
			<GroupMembersDialog
				open={dialogName === "GroupMembersDialog"}
				group={current}
				close={() => setDialogName("")}
				onChanged={refetch}
			/>
		</>
	);
};

Groups.wName = "Groups";

export default Groups;
