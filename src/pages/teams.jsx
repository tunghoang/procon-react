import { Paper, Chip, Box } from "@mui/material";
import { useIntl } from "react-intl";
import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useApi, useFetchData } from "../api";
import TeamDialog from "../dialogs/team";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import TeamPasswordDialog from "../dialogs/password";

const Teams = () => {
	const { formatMessage: tr } = useIntl();
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
			flex: 1,
			headerClassName: "tableHeader",
			valueGetter: (params) => {
				return params.row.is_admin ? "Admin" : "User";
			},
		},
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
		setCurrentTeam({ name: "", account: "", is_admin: false, password: "" });
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
		let result;
		if (currentTeam.id) {
			result = await apiEdit(currentTeam.id, currentTeam);
		} else {
			result = await apiCreate(currentTeam);
		}
		if (result) await refetch();
		setDialogName("");
	};
	const changeInstance = (changes) => {
		setCurrentTeam({ ...currentTeam, ...changes });
	};

	return (
		<>
			<PageToolbar
				title={tr({ id: "Teams" })}
				showNew={true}
				showEdit={(selectedTeamIds || []).length === 1}
				showDelete={(selectedTeamIds || []).length}
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
		</>
	);
};

Teams.wName = "Teams";

export default Teams;
