import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import VisibilityIcon from "@mui/icons-material/Visibility";
import * as mui from "@mui/material";
import { useParams, useSearch } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import { api } from "../api/commons";
import { apiBulkAddTeams, apiBulkRemoveTeams } from "../api/match";
import { SERVICE_API } from "../config/env";
import DataTable from "../components/DataTable/data-table";
import PageToolbar from "../components/page-toolbar";
import Context from "../context";
import { ManageTeamMatchDialog, MatchDialog } from "../dialogs/match";
import { formatDateTime } from "../utils/commons";

const Matches = () => {
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });
	const roundId =
		routeParams.roundId || searchParams.roundId || searchParams.round_id;
	const { formatMessage: tr } = useIntl();
	const { team } = useContext(Context);
	const isReadOnly = !team || !team.is_admin;
	const [selectedMatchIds, setSelectedMatchIds] = useState([]);
	const [showTimeFilter, setShowTimeFilter] = useState(false);
	const [timeFrom, setTimeFrom] = useState("");
	const [timeTo, setTimeTo] = useState("");
	const [matchActiveStates, setMatchActiveStates] = useState({});
	const { useConfirmDelete, apiCreate, apiEdit } = useApi("/match", "Match");
	const apiDeleteMatch = useConfirmDelete();
	const buildParams = () => {
		const params = {
			eq_round_id: roundId,
		};
		if (timeFrom) {
			params["gte_start_time"] = timeFrom;
			params["gte_end_time"] = timeFrom;
		}
		if (timeTo) {
			params["lte_start_time"] = timeTo;
			params["lte_end_time"] = timeTo;
		}
		return params;
	};

	const {
		data: matches,
		refetch: originalRefetch,
		loading,
	} = useFetchData({
		path: "/match",
		name: "Match",
		config: {
			params: buildParams(),
		},
	});

	const refetch = async (...args) => {
		setMatchActiveStates({});
		return await originalRefetch(...args);
	};

	const filterOptions = [
		{
			key: "match_id",
			label: "ID",
			type: "text",
		},
		{
			key: "match_name",
			label: "Name",
			type: "text",
		},
		{
			key: "match_is_active",
			label: "Status",
			type: "boolean",
			options: [
				{
					label: "Active",
					value: 1,
				},
				{
					label: "Inactive",
					value: 0,
				},
			],
		},
	];

	// Generate diverse color based on team id
	const getTeamColor = (id) => {
		const colors = [
			"#1976d2", // blue
			"#d32f2f", // red
			"#388e3c", // green
			"#f57c00", // orange
			"#7b1fa2", // purple
			"#0097a7", // cyan
			"#c2185b", // pink
			"#5d4037", // brown
			"#455a64", // blue grey
			"#00897b", // teal
			"#6a1b9a", // deep purple
			"#303f9f", // indigo
		];
		return colors[id % colors.length];
	};

	// Teams Cell Component with Popover
	const TeamsCell = ({ teams }) => {
		const [anchorEl, setAnchorEl] = useState(null);

		if (!teams || teams.length === 0) {
			return (
				<mui.Typography
					variant="caption"
					sx={{
						color: "error.main",
						fontWeight: "bold",
					}}>
					No teams
				</mui.Typography>
			);
		}

		const handlePopoverOpen = (event) => {
			setAnchorEl(event.currentTarget);
		};

		const handlePopoverClose = () => {
			setAnchorEl(null);
		};

		const open = Boolean(anchorEl);

		return (
			<>
				<mui.Stack
					direction="row"
					alignItems="center"
					spacing={0.5}
					sx={{ cursor: "pointer" }}
					onMouseEnter={handlePopoverOpen}
					onMouseLeave={handlePopoverClose}>
					<VisibilityIcon fontSize="small" color="action" />
					<mui.Typography variant="body2" color="text.secondary">
						{teams.length} {teams.length === 1 ? "team" : "teams"}
					</mui.Typography>
				</mui.Stack>
				<mui.Popover
					sx={{
						pointerEvents: "none",
					}}
					open={open}
					anchorEl={anchorEl}
					anchorOrigin={{
						vertical: "bottom",
						horizontal: "left",
					}}
					transformOrigin={{
						vertical: "top",
						horizontal: "left",
					}}
					onClose={handlePopoverClose}
					disableRestoreFocus>
					<mui.Box sx={{ p: 2, maxWidth: 400 }}>
						<mui.Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{teams.map((team) => (
								<mui.Chip
									key={team.id}
									label={team.name}
									size="small"
									sx={{
										backgroundColor: getTeamColor(team.id),
										color: "#fff",
										mb: 0.5,
									}}
								/>
							))}
						</mui.Stack>
					</mui.Box>
				</mui.Popover>
			</>
		);
	};

	const columns = [
		{
			field: "id",
			headerName: "ID",
			flex: 0.5,
		},
		{
			field: "name",
			headerName: tr({ id: "name" }),
			flex: 1.5,
		},
		{
			field: "teams",
			headerName: tr({ id: "teams" }),
			filterable: false,
			sortable: false,
			flex: 1,
			renderCell: ({ row }) => <TeamsCell teams={row.teams} />,
		},
		{
			field: "description",
			headerName: tr({ id: "description" }),
			flex: 2,
		},
		{
			field: "start_time",
			headerName: tr({ id: "start-time" }),
			filterable: false,
			flex: 1.5,
			valueGetter: ({ value }) => {
				return formatDateTime(value);
			},
		},
		{
			field: "end_time",
			headerName: tr({ id: "end-time" }),
			filterable: false,
			flex: 1.5,
			valueGetter: ({ value }) => {
				return formatDateTime(value);
			},
		},
		{
			field: "is_active",
			headerName: tr({ id: "active" }),
			filterable: false,
			flex: 1.2,
			renderCell: ({ row }) => {
				const isActive =
					matchActiveStates[row.id] !== undefined
						? matchActiveStates[row.id]
						: row.is_active;
				if (isReadOnly) {
					return isActive ? (
						<mui.Chip label="Active" color="success" />
					) : (
						<mui.Chip label="Inactive" />
					);
				}
				return (
					<mui.Switch
						checked={isActive}
						onChange={() => handleToggleActive(row.id, isActive)}
						color="success"
						size="medium"
					/>
				);
			},
		},
		{
			field: "actions",
			headerName: tr({ id: "actions" }),
			filterable: false,
			sortable: false,
			width: 160,
			renderCell: ({ row }) => {
				if (isReadOnly) return null;
				return (
					<mui.Stack direction="row" spacing={0.5}>
						<mui.Tooltip title="Edit">
							<mui.IconButton
								size="small"
								color="primary"
								onClick={() => {
									setCurrentMatch({
										...row,
										teams: row?.teams || [],
									});
									setDialogName("MatchDialog");
								}}>
								<EditIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						<mui.Tooltip title="Manage Teams">
							<mui.IconButton
								size="small"
								color="primary"
								onClick={() => {
									setCurrentMatch({
										...row,
										teams: row?.teams || [],
									});
									setDialogName("ManageTeamMatchDialog");
								}}>
								<GroupsIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						<mui.Tooltip title="Delete">
							<mui.IconButton
								size="small"
								color="error"
								onClick={() => handleDeleteMatch(row.id)}>
								<DeleteIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
					</mui.Stack>
				);
			},
		},
	];
	const [dialogName, setDialogName] = useState("");
	const [currentMatch, setCurrentMatch] = useState({});
	const [confirmDialog, setConfirmDialog] = useState({
		open: false,
		title: "",
		message: "",
		onConfirm: null,
	});

	const openConfirmDialog = (title, message, onConfirm) => {
		setConfirmDialog({ open: true, title, message, onConfirm });
	};

	const closeConfirmDialog = () => {
		setConfirmDialog((prev) => ({ ...prev, open: false }));
	};

	const handleToggleActive = async (matchId, currentStatus) => {
		const newStatus = !currentStatus;

		// Check if trying to activate a match without teams
		if (newStatus) {
			const match = matches.find((m) => m.id === matchId);
			if (!match?.teams || match.teams.length === 0) {
				openConfirmDialog(
					tr({ id: "no-teams-assigned" }),
					tr({ id: "no-teams-assigned-message" }),
					async () => {
						await toggleMatchActive(matchId, currentStatus, newStatus);
						closeConfirmDialog();
					}
				);
				return;
			}
		}

		// If no warning needed, toggle directly
		await toggleMatchActive(matchId, currentStatus, newStatus);
	};

	const toggleMatchActive = async (matchId, currentStatus, newStatus) => {
		// Optimistic update
		setMatchActiveStates((prev) => ({
			...prev,
			[matchId]: newStatus,
		}));
		try {
			await api.put(`${SERVICE_API}/match/${matchId}`, {
				is_active: newStatus,
			});
		} catch (error) {
			console.error("Failed to toggle match status:", error);
			// Revert on error
			setMatchActiveStates((prev) => ({
				...prev,
				[matchId]: currentStatus,
			}));
		}
	};

	const handleDeleteMatch = async (matchId) => {
		const result = await apiDeleteMatch([matchId]);
		if (result.length) await refetch();
	};

	const handleBulkToggleActive = async (activate) => {
		const action = activate ? "activate" : "deactivate";

		// Check if trying to activate matches without teams
		if (activate) {
			const selectedMatches = matches.filter((m) =>
				selectedMatchIds.includes(m.id)
			);
			const matchesWithoutTeams = selectedMatches.filter(
				(m) => !m.teams || m.teams.length === 0
			);

			if (matchesWithoutTeams.length > 0) {
				const matchNames = matchesWithoutTeams.map((m) => m.name).join(", ");
				openConfirmDialog(
					"⚠️ Some Matches Have No Teams",
					`The following ${matchesWithoutTeams.length} match(es) have no teams assigned: ${matchNames}. Are you sure you want to activate them?`,
					async () => {
						await performBulkToggle(activate);
						closeConfirmDialog();
					}
				);
				return;
			}
		}

		// If no warning needed, show normal confirmation
		openConfirmDialog(
			`${activate ? "Activate" : "Deactivate"} Matches`,
			`Are you sure you want to ${action} ${selectedMatchIds.length} selected match(es)?`,
			async () => {
				await performBulkToggle(activate);
				closeConfirmDialog();
			}
		);
	};

	const performBulkToggle = async (activate) => {
		const action = activate ? "activate" : "deactivate";

		// Optimistic update for all selected matches
		const updates = {};
		selectedMatchIds.forEach((id) => {
			updates[id] = activate;
		});
		setMatchActiveStates((prev) => ({ ...prev, ...updates }));

		try {
			await Promise.all(
				selectedMatchIds.map((id) =>
					api.put(`${SERVICE_API}/match/${id}`, {
						is_active: activate,
					})
				)
			);
		} catch (error) {
			console.error(`Failed to ${action} matches:`, error);
			// Revert on error
			await refetch();
			setMatchActiveStates({});
		}
	};

	const handleManageTeams = () => {
		// Get all unique teams from all selected matches
		const selectedMatches = matches.filter((m) =>
			selectedMatchIds.includes(m.id)
		);
		const allTeamsMap = new Map();
		selectedMatches.forEach((match) => {
			match.teams?.forEach((team) => {
				allTeamsMap.set(team.id, team);
			});
		});
		const allUniqueTeams = Array.from(allTeamsMap.values());

		setCurrentMatch({
			id: "bulk",
			teams: allUniqueTeams,
		});
		setDialogName("BulkManageTeamMatchDialog");
	};

	const clickNew = () => {
		setCurrentMatch({
			name: "New Match",
			description: "",
			is_active: false,
			team_id: "",
		});
		setDialogName("MatchDialog");
	};
	const closeDialog = () => {
		setDialogName("");
	};
	const clickDelete = async () => {
		const result = await apiDeleteMatch(selectedMatchIds);
		if (result.length) await refetch();
	};

	const saveInstance = async () => {
		let result;
		if (currentMatch.id) {
			result = await apiEdit(currentMatch.id, currentMatch);
		} else {
			currentMatch.round_id = roundId;
			result = await apiCreate(currentMatch);
		}
		if (result) await refetch();
		setDialogName("");
	};
	const changeInstance = (changes) => {
		setCurrentMatch({ ...currentMatch, ...changes });
	};

	const handleAction = async (teams, action) => {
		const matchIds = [currentMatch.id];
		const teamIds = teams.map((t) => t.id);

		let result;
		if (action === "add") {
			result = await apiBulkAddTeams(matchIds, teamIds);
		} else if (action === "delete") {
			result = await apiBulkRemoveTeams(matchIds, teamIds);
		} else return;

		if (result) await refetch();
		setDialogName("");
	};

	const handleBulkAction = async (teams, action) => {
		const teamIds = teams.map((t) => t.id);

		let result;
		if (action === "add") {
			result = await apiBulkAddTeams(selectedMatchIds, teamIds);
		} else if (action === "delete") {
			result = await apiBulkRemoveTeams(selectedMatchIds, teamIds);
		} else return;

		if (result) await refetch();
		setDialogName("");
	};

	const handleDeleteAllTeams = async () => {
		openConfirmDialog(
			"Delete All Teams",
			`Are you sure you want to remove all teams from ${selectedMatchIds.length} selected match(es)?`,
			async () => {
				try {
					// Get all selected matches
					const selectedMatches = matches.filter((m) =>
						selectedMatchIds.includes(m.id)
					);

					// Get all unique team IDs from selected matches
					const allTeamIds = [
						...new Set(
							selectedMatches.flatMap((m) => m.teams?.map((t) => t.id) || [])
						),
					];

					if (allTeamIds.length === 0) {
						closeConfirmDialog();
						return;
					}

					const result = await apiBulkRemoveTeams(selectedMatchIds, allTeamIds);
					if (result) await refetch();
					setDialogName("");
				} catch (error) {
					console.error("Failed to delete all teams:", error);
				}
				closeConfirmDialog();
			}
		);
	};

	return (
		<>
			<PageToolbar
				title={tr({ id: "Matches" })}
				showNew={!isReadOnly}
				showDelete={!isReadOnly && !!selectedMatchIds.length}
				handleNew={clickNew}
				handleDelete={clickDelete}
				customBtns={
					!isReadOnly && selectedMatchIds.length > 0
						? [
								{
									label: "Manage Teams",
									fn: handleManageTeams,
									color: "primary",
									icon: <GroupsIcon />,
								},
								{
									label: "Activate",
									fn: () => handleBulkToggleActive(true),
									color: "success",
									icon: <ToggleOnIcon />,
								},
								{
									label: "Deactivate",
									fn: () => handleBulkToggleActive(false),
									color: "warning",
									icon: <ToggleOffIcon />,
								},
						  ]
						: []
				}
			/>
			<mui.Paper
				component="main"
				sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				<DataTable
					showTimeFilter={showTimeFilter}
					onToggleTimeFilter={() => setShowTimeFilter(!showTimeFilter)}
					timeFrom={timeFrom}
					timeTo={timeTo}
					onTimeFromChange={setTimeFrom}
					onTimeToChange={setTimeTo}
					onTimeFilterSearch={refetch}
					onTimeFilterClear={() => {
						setTimeFrom("");
						setTimeTo("");
					}}
					filterOptions={filterOptions}
					onFilter={async (params) => await refetch(params)}
					rows={matches}
					columns={columns}
					onSelectionModelChange={(ids) => {
						setSelectedMatchIds(ids);
					}}
					loading={loading}
					onRefresh={refetch}
				/>
			</mui.Paper>
			{dialogName === "MatchDialog" && (
				<MatchDialog
					open={dialogName === "MatchDialog"}
					instance={currentMatch}
					close={closeDialog}
					save={saveInstance}
					handleChange={changeInstance}
				/>
			)}
			{dialogName === "ManageTeamMatchDialog" && (
				<ManageTeamMatchDialog
					open={dialogName === "ManageTeamMatchDialog"}
					close={closeDialog}
					teams={currentMatch.teams}
					handleAdd={(teams) => handleAction(teams, "add")}
					handleDelete={(teams) => handleAction(teams, "delete")}
				/>
			)}
			{dialogName === "BulkManageTeamMatchDialog" && (
				<ManageTeamMatchDialog
					open={dialogName === "BulkManageTeamMatchDialog"}
					close={closeDialog}
					teams={currentMatch.teams}
					handleAdd={(teams) => handleBulkAction(teams, "add")}
					handleDelete={(teams) => handleBulkAction(teams, "delete")}
					isBulkMode={true}
					handleDeleteAll={handleDeleteAllTeams}
				/>
			)}
			<mui.Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
				<mui.DialogTitle>{confirmDialog.title}</mui.DialogTitle>
				<mui.DialogContent>
					<mui.Typography>{confirmDialog.message}</mui.Typography>
				</mui.DialogContent>
				<mui.DialogActions>
					<mui.Button onClick={closeConfirmDialog}>Cancel</mui.Button>
					<mui.Button
						onClick={confirmDialog.onConfirm}
						color="error"
						variant="contained">
						Confirm
					</mui.Button>
				</mui.DialogActions>
			</mui.Dialog>
		</>
	);
};

Matches.wName = "Matches";

export default Matches;
