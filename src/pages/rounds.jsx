import { useState, useContext, useEffect } from "react";
import {
	Box,
	Container,
	Grid,
	Button,
	Typography,
	Toolbar,
} from "@mui/material";
import { DashboardNavbar } from "../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import { apiBulkAddTeams, apiBulkRemoveTeams } from "../api/match";
import { api, getError, showMessage } from "../api/commons";
import { SERVICE_API } from "../config/env";
import { useNavigate, useParams } from "@tanstack/react-router";
import Context from "../context";
import RoundDialog from "../dialogs/round";
import { BulkAddTeamsToRoundDialog } from "../dialogs/round-teams";
import AddIcon from "@mui/icons-material/Add";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";
import { isSuperAdmin, isStaff } from "../utils/roles";
import { sharedGroupId } from "../utils/match-group";

const Rounds = () => {
	const { tournamentId } = useParams({ strict: false });
	const [showDialog, setShowDialog] = useState(false);
	const [currentItem, setCurrentItem] = useState(null);
	const [showTeamsDialog, setShowTeamsDialog] = useState(false);
	const [selectedRound, setSelectedRound] = useState(null);
	const [roundMatches, setRoundMatches] = useState([]);
	const [loadingMatches, setLoadingMatches] = useState(false);
	const { updateContext, team } = useContext(Context);
	const navigate = useNavigate();
	// Rounds themselves are superadmin-only; a group manager may still step
	// into a round's matches (its own group's) from here.
	const isReadOnly = !isSuperAdmin(team);
	const canEnterMatches = isStaff(team);
	const { apiCreate, useConfirmDelete, apiEdit } = useApi("/round", "Round");

	const { formatMessage: tr } = useIntl();
	const {
		data: rounds,
		refetch,
		loading,
	} = useFetchData({
		path: "/round",
		name: "Round",
		config: {
			params: {
				eq_tournament_id: tournamentId,
			},
		},
	});

	useEffect(() => {
		updateContext({ round: null });
	}, []);

	const apiDeleteDialog = useConfirmDelete();
	const handleDelete = async (item) => {
		const res = await apiDeleteDialog([item.id]);
		if (res.length) await refetch();
	};

	const handleManageTeams = async (round) => {
		setSelectedRound(round);
		setLoadingMatches(true);
		let matches = null;
		try {
			const response = await api.get(
				`${SERVICE_API}/match`,
				{ params: { eq_round_id: round.id } }
			);
			matches = response.data || [];
		} catch (error) {
			// A silent console.error left the dialog open and claiming the round
			// had no matches, which reads as "nothing to roster" rather than
			// "the request failed".
			showMessage(getError(error), "error", 6000);
		}
		setLoadingMatches(false);
		if (matches === null) {
			setRoundMatches([]);
			return;
		}
		// This dialog adds the SAME teams to EVERY match in the round, so a
		// round whose matches belong to different groups has no valid roster at
		// all -- the backend would reject the batch as a whole. Refuse before
		// opening, exactly as the Matches page's bulk dialog does.
		const { mixed } = sharedGroupId(matches);
		if (mixed) {
			setRoundMatches([]);
			showMessage(tr({ id: "roundTeams.mixedGroups" }), "warning", 8000);
			return;
		}
		setRoundMatches(matches);
		setShowTeamsDialog(true);
	};

	/** Re-read the round's matches so the dialog shows the new rosters. */
	const reloadRoundMatches = async () => {
		if (!selectedRound?.id) return;
		try {
			const response = await api.get(
				`${SERVICE_API}/match`,
				{ params: { eq_round_id: selectedRound.id } }
			);
			setRoundMatches(response.data || []);
		} catch (error) {
			showMessage(getError(error), "error", 6000);
		}
	};

	// api/match.js already toasts the outcome (including a 502 partial sync and
	// any staff accounts the backend skipped), so these only have to refresh --
	// and say so when the refresh itself fails, instead of a console.error
	// nobody sees.
	const handleBulkAddTeams = async (teams) => {
		if (!roundMatches.length || !teams.length) return;
		const matchIds = roundMatches.map((m) => m.id);
		const teamIds = teams.map((t) => t.id);
		await apiBulkAddTeams(matchIds, teamIds);
		await reloadRoundMatches();
	};

	const handleBulkRemoveTeams = async (teams) => {
		if (!roundMatches.length || !teams.length) return;
		const matchIds = roundMatches.map((m) => m.id);
		const teamIds = teams.map((t) => t.id);
		await apiBulkRemoveTeams(matchIds, teamIds);
		await reloadRoundMatches();
	};

	if (loading) return <LoadingPage />;

	return (
		<>
			<DashboardNavbar position="fixed" sx={{ left: 0, width: "100%" }} />
			<Box sx={{ pt: 10, minHeight: "100vh" }}>
				<Container maxWidth="lg">
					<Toolbar
						sx={{ justifyContent: "space-between" }}
						style={{ padding: 0, marginBottom: "16px" }}>
						<Typography variant="h5">{tr({ id: "Rounds" })}</Typography>
						{!isReadOnly && (
							<Button
								onClick={() => {
									setCurrentItem({ name: "", description: "" });
									setShowDialog(true);
								}}>
								<AddIcon />
								{tr({ id: "Create" })}
							</Button>
						)}
					</Toolbar>
					<Grid container spacing={3}>
						{rounds.length ? (
							rounds.map((round) => (
								<Grid key={round.id} size={{ lg: 6, md: 6, xs: 12 }}>
									<CardData
										name={round.name}
										description={round.description}
										handleDelete={isReadOnly ? null : () => handleDelete(round)}
										handleEdit={
											isReadOnly
												? null
												: () => {
														setCurrentItem(round);
														setShowDialog(true);
												  }
										}
										handleSelect={() => {
											updateContext({ round });
											navigate({
												to: `/competition/tournament/$tournamentId/round/$roundId`,
												params: { tournamentId, roundId: round.id },
											});
										}}
										handleManageTeams={
											isReadOnly ? null : () => handleManageTeams(round)
										}
										handleEditDetail={
											!canEnterMatches
												? null
												: () => {
														updateContext({ round });
														navigate({
															to: `/admin/matches`,
															search: {
																tournament_id: parseInt(tournamentId),
																round_id: round.id,
															},
														});
												  }
										}
									/>
								</Grid>
							))
						) : (
							<Typography
								variant="h4"
								m="auto"
								sx={{
									opacity: 0.3,
									verticalAlign: "middle",
									lineHeight: "300px",
								}}>
								Create new round
							</Typography>
						)}
					</Grid>
				</Container>
			</Box>
			<RoundDialog
				open={showDialog}
				round={currentItem}
				close={() => setShowDialog(false)}
				save={async () => {
					if (currentItem.id) await apiEdit(currentItem.id, currentItem);
					else {
						currentItem.tournament_id = tournamentId;
						await apiCreate(currentItem);
					}
					setShowDialog(false);
					await refetch();
				}}
				handleChange={(change) => {
					setCurrentItem({ ...currentItem, ...change });
				}}
			/>
			<BulkAddTeamsToRoundDialog
				open={showTeamsDialog}
				close={() => setShowTeamsDialog(false)}
				roundName={selectedRound?.name}
				matches={roundMatches}
				loading={loadingMatches}
				// Every match in the round shares this group (a mixed round never
				// opens the dialog), so the candidate list can be narrowed to it.
				groupId={sharedGroupId(roundMatches).groupId}
				handleAdd={handleBulkAddTeams}
				handleRemove={handleBulkRemoveTeams}
			/>
		</>
	);
};

export default Rounds;
