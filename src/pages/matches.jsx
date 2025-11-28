import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	Paper,
	Popover,
	Stack,
	Switch,
	Tooltip,
	Typography,
} from "@mui/material";
import { useParams, useSearch } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import { api } from "../api/commons";
import { apiDeleteTeamMatch, apiNewTeamMatch } from "../api/match";
import DataTable from "../components/DataTable/data-table";
import { DashboardLayout } from "../components/dashboard-layout";
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
	const [selectedMatch, setSelectedMatch] = useState({});
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
				<Typography variant="caption" color="text.secondary">
					No teams
				</Typography>
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
				<Stack
					direction="row"
					alignItems="center"
					spacing={0.5}
					sx={{ cursor: "pointer" }}
					onMouseEnter={handlePopoverOpen}
					onMouseLeave={handlePopoverClose}>
					<VisibilityIcon fontSize="small" color="action" />
					<Typography variant="body2" color="text.secondary">
						{teams.length} {teams.length === 1 ? "team" : "teams"}
					</Typography>
				</Stack>
				<Popover
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
					<Box sx={{ p: 2, maxWidth: 400 }}>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{teams.map((team) => (
								<Chip
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
						</Stack>
					</Box>
				</Popover>
			</>
		);
	};

	const columns = [
		{
			field: "id",
			headerName: "ID",
			width: 100,
		},
		{
			field: "name",
			headerName: "Name",
			flex: 1.5,
		},
		{
			field: "teams",
			headerName: "Teams",
			filterable: false,
			sortable: false,
			flex: 1,
			renderCell: ({ row }) => <TeamsCell teams={row.teams} />,
		},
		{
			field: "description",
			headerName: "Description",
			flex: 2,
		},
		{
			field: "start_time",
			headerName: "Start Time",
			filterable: false,
			flex: 1.5,
			valueGetter: ({ value }) => {
				return formatDateTime(value);
			},
		},
		{
			field: "end_time",
			headerName: "End Time",
			filterable: false,
			flex: 1.5,
			valueGetter: ({ value }) => {
				return formatDateTime(value);
			},
		},
		{
			field: "is_active",
			headerName: "Active",
			filterable: false,
			flex: 1,
			renderCell: ({ row }) => {
				const isActive =
					matchActiveStates[row.id] !== undefined
						? matchActiveStates[row.id]
						: row.is_active;
				if (isReadOnly) {
					return isActive ? (
						<Chip label="Active" color="success" />
					) : (
						<Chip label="Inactive" />
					);
				}
				return (
					<Switch
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
			headerName: "Actions",
			filterable: false,
			sortable: false,
			width: 160,
			renderCell: ({ row }) => {
				if (isReadOnly) return null;
				return (
					<Stack direction="row" spacing={0.5}>
						<Tooltip title="Edit">
							<IconButton
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
							</IconButton>
						</Tooltip>
						<Tooltip title="Manage Teams">
							<IconButton
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
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete">
							<IconButton
								size="small"
								color="error"
								onClick={() => handleDeleteMatch(row.id)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Stack>
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
		// Optimistic update
		setMatchActiveStates((prev) => ({
			...prev,
			[matchId]: newStatus,
		}));
		try {
			await api.put(`${import.meta.env.VITE_SERVICE_API}/match/${matchId}`, {
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
		openConfirmDialog(
			`${activate ? "Activate" : "Deactivate"} Matches`,
			`Are you sure you want to ${action} ${selectedMatchIds.length} selected match(es)?`,
			async () => {
				// Optimistic update for all selected matches
				const updates = {};
				selectedMatchIds.forEach((id) => {
					updates[id] = activate;
				});
				setMatchActiveStates((prev) => ({ ...prev, ...updates }));

				try {
					await Promise.all(
						selectedMatchIds.map((id) =>
							api.put(`${import.meta.env.VITE_SERVICE_API}/match/${id}`, {
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
				closeConfirmDialog();
			}
		);
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
		let apiAction;
		let matchId;
		if (action === "add") {
			apiAction = apiNewTeamMatch;
			matchId = currentMatch.id;
		} else if (action === "delete") {
			apiAction = apiDeleteTeamMatch;
			matchId = currentMatch.id;
		} else return;

		const result = await Promise.all(
			teams.map(async (team) => await apiAction(matchId, team.id))
		);
		if (result.length) await refetch();
		setDialogName("");
	};

	const handleBulkAction = async (teams, action) => {
		let apiAction;
		if (action === "add") {
			apiAction = apiNewTeamMatch;
		} else if (action === "delete") {
			apiAction = apiDeleteTeamMatch;
		} else return;

		const result = await Promise.all(
			selectedMatchIds.flatMap((matchId) =>
				teams.map(async (team) => await apiAction(matchId, team.id))
			)
		);
		if (result.length) await refetch();
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

					// For each match, delete only the teams that exist in that match
					const deletePromises = [];
					selectedMatches.forEach((match) => {
						match.teams?.forEach((team) => {
							deletePromises.push(apiDeleteTeamMatch(match.id, team.id));
						});
					});

					if (deletePromises.length === 0) {
						closeConfirmDialog();
						return;
					}

					const result = await Promise.all(deletePromises);
					if (result.length) await refetch();
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
			<Paper
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
			</Paper>
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
			<Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
				<DialogTitle>{confirmDialog.title}</DialogTitle>
				<DialogContent>
					<Typography>{confirmDialog.message}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeConfirmDialog}>Cancel</Button>
					<Button
						onClick={confirmDialog.onConfirm}
						color="error"
						variant="contained">
						Confirm
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};
Matches.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Matches.wName = "Matches";

export default Matches;
