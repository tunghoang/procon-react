import { useContext, useEffect } from "react";
import {
	Box,
	Container,
	Grid,
	Typography,
	Toolbar,
	Chip,
	Stack,
	Button,
} from "@mui/material";
import { DashboardLayoutRoot } from "../../components/dashboard-layout";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useFetchData } from "../../api";
import { navigate } from "hookrouter";
import Context from "../../context";
import CardData from "../../components/card-data";
import LoadingPage from "../../components/loading-page";
import { formatDateTime } from "../../utils/commons";
import TournamentIcon from "@mui/icons-material/EmojiEvents";

const Competition = ({ tournamentId, roundId }) => {
	const { updateContext } = useContext(Context);
	const { formatMessage: tr } = useIntl();

	const { data: matches, loading } = useFetchData({
		path: "/match",
		name: "Match",
		config:
			tournamentId || roundId
				? {
						params: {
							...(tournamentId && { eq_round_tournament_id: tournamentId }),
							...(roundId && { eq_round_id: roundId }),
						},
				  }
				: undefined,
	});

	useEffect(() => {
		updateContext({ userMatch: null });
	}, []);

	const renderMatches = () => {
		const activeMatches = matches.filter((m) => m.is_active);
		if (!activeMatches.length)
			return (
				<Typography
					variant="h4"
					m="auto"
					sx={{
						opacity: 0.3,
						verticalAlign: "middle",
						lineHeight: "300px",
					}}>
					No matches available
				</Typography>
			);

		// Group matches by tournament and round
		const grouped = {};
		activeMatches.forEach((match) => {
			const tournamentName = match.round.tournament.name;
			const roundName = match.round.name;
			const key = `${tournamentName}|||${roundName}`;

			if (!grouped[key]) {
				grouped[key] = {
					tournament: tournamentName,
					round: roundName,
					matches: [],
				};
			}
			grouped[key].matches.push(match);
		});

		return Object.values(grouped).map((group, groupIndex) => (
			<Box key={groupIndex} sx={{ width: "100%", mb: 4 }}>
				<Typography
					variant="h6"
					sx={{
						mb: 2,
						pb: 1,
						borderBottom: 2,
						borderColor: "primary.main",
						display: "flex",
						alignItems: "center",
						gap: 1,
					}}>
					<Chip label={group.tournament} color="primary" />
					<Typography component="span" variant="h6">
						-
					</Typography>
					<Chip label={group.round} color="warning" />
				</Typography>
				<Grid container spacing={3}>
					{group.matches.map((match) => (
						<Grid item key={match.id} lg={4} md={6} xs={12}>
							<CardData
								style={{ border: "1px solid", borderColor: "#b6bdc5ff" }}
								header={
									match.is_active ? (
										<Chip label="Active" color="success" />
									) : (
										<Chip label="Inactive" />
									)
								}
								disabled={!match.is_active}
								name={match.name}
								description={
									<>
										<Stack spacing={0.5}>
											<Typography variant="body1" color="text.primary">
												{match.description}
											</Typography>

											<Typography variant="body2" color="text.secondary">
												<strong>Start:</strong>{" "}
												{formatDateTime(match.start_time)}
											</Typography>

											<Typography variant="body2" color="text.secondary">
												<strong>End:</strong> {formatDateTime(match.end_time)}
											</Typography>
										</Stack>
									</>
								}
								showAction={false}
								handleSelect={() => {
									const tournamentId = match.round.tournament.id;
									const roundId = match.round.id;
									navigate(
										`/competition/tournament/${tournamentId}/round/${roundId}/match/${match.id}/questions`
									);
									updateContext({ userMatch: match });
								}}
							/>
						</Grid>
					))}
				</Grid>
			</Box>
		));
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
							<Typography variant="h5">{tr({ id: "Matches" })}</Typography>
							<Button
								variant="outlined"
								startIcon={<TournamentIcon />}
								onClick={() => navigate("/tournament")}>
								{tr({ id: "Tournaments" })}
							</Button>
						</Toolbar>
						<Box>{renderMatches()}</Box>
					</Container>
				</Box>
			</DashboardLayoutRoot>
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

export default Competition;
