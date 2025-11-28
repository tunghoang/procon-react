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
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import { useNavigate, useParams } from "@tanstack/react-router";
import Context from "../context";
import RoundDialog from "../dialogs/round";
import AddIcon from "@mui/icons-material/Add";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";

const Rounds = () => {
	const { tournamentId } = useParams({ strict: false });
	const [showDialog, setShowDialog] = useState(false);
	const [currentItem, setCurrentItem] = useState(null);
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

	if (loading) return <LoadingPage />;

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
											handleDelete={
												isReadOnly ? null : () => handleDelete(round)
											}
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
			</DashboardLayoutRoot>
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

export default Rounds;
