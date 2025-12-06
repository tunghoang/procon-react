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
import { api } from "../api/commons";
import { SERVICE_API } from "../config/env";
import { useNavigate, useParams } from "@tanstack/react-router";
import Context from "../context";
import RoundDialog from "../dialogs/round";
import { BulkAddTeamsToRoundDialog } from "../dialogs/round-teams";
import AddIcon from "@mui/icons-material/Add";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";

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
	const isReadOnly = !team || !team.is_admin;
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
		try {
			const response = await api.get(
				`${SERVICE_API}/match`,
				{ params: { eq_round_id: round.id } }
			);
			setRoundMatches(response.data || []);
		} catch (error) {
			console.error("Failed to fetch matches:", error);
			setRoundMatches([]);
		}
		setLoadingMatches(false);
		setShowTeamsDialog(true);
	};

	const handleBulkAddTeams = async (teams) => {
		if (!roundMatches.length || !teams.length) return;

		try {
			const matchIds = roundMatches.map((m) => m.id);
			const teamIds = teams.map((t) => t.id);
			await apiBulkAddTeams(matchIds, teamIds);
			// Refetch matches to update the dialog
			const response = await api.get(
				`${SERVICE_API}/match`,
				{ params: { eq_round_id: selectedRound.id } }
			);
			setRoundMatches(response.data || []);
		} catch (error) {
			console.error("Failed to add teams:", error);
		}
	};

	const handleBulkRemoveTeams = async (teams) => {
		if (!roundMatches.length || !teams.length) return;

		try {
			const matchIds = roundMatches.map((m) => m.id);
			const teamIds = teams.map((t) => t.id);
			await apiBulkRemoveTeams(matchIds, teamIds);
			// Refetch matches to update the dialog
			const response = await api.get(
				`${SERVICE_API}/match`,
				{ params: { eq_round_id: selectedRound.id } }
			);
			setRoundMatches(response.data || []);
		} catch (error) {
			console.error("Failed to remove teams:", error);
		}
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
											isReadOnly
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
				handleAdd={handleBulkAddTeams}
				handleRemove={handleBulkRemoveTeams}
			/>
		</>
	);
};

export default Rounds;
