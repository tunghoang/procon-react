import { Box, Container, Stack, Tooltip, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import GamePlay from "../../components/procon26/game-play";
import { copyText } from "../../utils/commons";
import { showMessage } from "../../api/commons";

/**
 * HEXUDON play screen. `gameId` equals the team-manager question id (the
 * manager registers each question as a game on the game service at creation).
 */
const UserGame = () => {
	const { gameId } = useParams({ strict: false });
	const { formatMessage: tr } = useIntl();

	return (
		<>
			<DashboardNavbar position="fixed" sx={{ left: 0, width: "100%" }} />
			<Box sx={{ pt: 10, minHeight: "100vh", pb: 4 }}>
				<Container maxWidth="xl">
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
						<IconButton
							aria-label={tr({ id: "Back" })}
							onClick={() => window.history.back()}>
							<ArrowBackIcon />
						</IconButton>
						<Typography variant="h5">{tr({ id: "hexudon.title" })}</Typography>
						<Typography
							variant="body2"
							color="textSecondary"
							title={gameId}
							sx={{
								maxWidth: { xs: 120, sm: 300 },
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}>
							{gameId}
						</Typography>
						<Tooltip title={tr({ id: "hexudon.copyId" })}>
							<IconButton
								size="small"
								aria-label={tr({ id: "hexudon.copyId" })}
								onClick={async () => {
									if (await copyText(gameId)) {
										showMessage(tr({ id: "hexudon.copiedId" }), "success", 2000);
									}
								}}>
								<ContentCopyIcon fontSize="inherit" />
							</IconButton>
						</Tooltip>
					</Stack>
					{gameId ? (
						<GamePlay gameId={gameId} />
					) : (
						<Typography color="error">Missing game id</Typography>
					)}
				</Container>
			</Box>
		</>
	);
};

export default UserGame;
