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
import Context from "../context";
import TournamentDialog from "../dialogs/tournament";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "@tanstack/react-router";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";

const Tournaments = () => {
	const [showDialog, setShowDialog] = useState(false);
	const [currentTournament, setCurrentTournament] = useState(null);
	const { updateContext, team } = useContext(Context);
	const { formatMessage: tr } = useIntl();
	const navigate = useNavigate();
	const isReadOnly = !team || !team.is_admin;
	const { useConfirmDelete, apiCreate, apiEdit } = useApi(
		"/tournament",
		"Tournament"
	);
	const {
		data: tournaments,
		refetch,
		loading,
	} = useFetchData({
		path: "/tournament",
		name: "Tournament",
	});
	useEffect(() => {
		updateContext({ tournament: null, round: null });
	}, []);
	const apiDeleteTournament = useConfirmDelete();
	const handleDelete = async (tournament) => {
		const res = await apiDeleteTournament([tournament.id]);
		if (res.length) await refetch();
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
						<Typography variant="h5">{tr({ id: "Tournaments" })}</Typography>
						{!isReadOnly && (
							<Button
								onClick={() => {
									setCurrentTournament({ name: "", description: "" });
									setShowDialog(true);
								}}>
								<AddIcon />
								{tr({ id: "Create" })}
							</Button>
						)}
					</Toolbar>
					<Grid container spacing={3}>
						{tournaments.length ? (
							tournaments.map((tournament) => (
								<Grid key={tournament.id} size={{ lg: 4, md: 6, xs: 12 }}>
									<CardData
										name={tournament.name}
										description={tournament.description}
										handleDelete={
											isReadOnly ? null : () => handleDelete(tournament)
										}
										handleEdit={
											isReadOnly
												? null
												: () => {
														setCurrentTournament(tournament);
														setShowDialog(true);
												  }
										}
										handleSelect={() => {
											updateContext({
												tournament,
											});
											navigate({ to: `/tournament/${tournament.id}/rounds` });
										}}
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
								Create new tournament
							</Typography>
						)}
					</Grid>
				</Container>
			</Box>
			<TournamentDialog
				open={showDialog}
				tournament={currentTournament}
				close={() => setShowDialog(false)}
				save={async () => {
					if (currentTournament.id)
						await apiEdit(currentTournament.id, currentTournament);
					else await apiCreate(currentTournament);
					setShowDialog(false);
					await refetch();
				}}
				handleChange={(change) => {
					setCurrentTournament({ ...currentTournament, ...change });
				}}
			/>
		</>
	);
};

export default Tournaments;
