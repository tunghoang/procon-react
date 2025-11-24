import { useState, useContext, useEffect } from "react";
import {
	Box,
	Container,
	Grid,
	Button,
	Typography,
	Toolbar,
} from "@mui/material";
import { DashboardLayoutRoot } from "../components/dashboard-layout";
import { DashboardNavbar } from "../components/dashboard-navbar";
import Context from "../context";
import TournamentDialog from "../dialogs/tournament";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import AddIcon from "@mui/icons-material/Add";
import { navigate } from "hookrouter";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";

const Tournaments = () => {
	const [showDialog, setShowDialog] = useState(false);
	const [currentTournament, setCurrentTournament] = useState(null);
	const { updateContext, team } = useContext(Context);
	const { formatMessage: tr } = useIntl();
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

	console.log(tournaments);

	return (
		<>
			<DashboardLayoutRoot style={{ paddingLeft: "0px", marginTop: "20px" }}>
				<Box
					sx={{
						display: "flex",
						flex: "1 1 auto",
						flexDirection: "column",
						width: "100%",
					}}>
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
									<Grid item key={tournament.id} lg={4} md={6} xs={12}>
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
												navigate(`/tournament/${tournament.id}/rounds`);
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
			</DashboardLayoutRoot>
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
			<DashboardNavbar
				sx={{
					left: 0,
					width: {
						lg: "100%",
					},
				}}
			/>
		</>
	);
};

export default Tournaments;
