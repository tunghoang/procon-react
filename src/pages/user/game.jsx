import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Container, Stack, Tooltip, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { jwtDecode } from "jwt-decode";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import GamePlay from "../../components/procon26/game-play";
import PracticePlay from "../../components/procon26/practice-play";
import LoadingPage from "../../components/loading-page";
import { api, showMessage } from "../../api/commons";
import { SERVICE_API } from "../../config/env";
import { copyText } from "../../utils/commons";

/**
 * HEXUDON play screen. `gameId` here is the team-manager question id.
 *  - Normal match: one shared game at that id -> GamePlay.
 *  - Practice match: each team plays its own game at `${questionId}:${teamId}`
 *    -> PracticePlay (self-paced, compare/copy). Detected from question_data.
 */
const UserGame = () => {
	const { gameId } = useParams({ strict: false });
	const { formatMessage: tr } = useIntl();

	const decoded = useMemo(() => {
		try {
			return jwtDecode(localStorage.getItem("token"));
		} catch {
			return null;
		}
	}, []);
	const isAdmin = !!decoded?.is_admin;
	const ownTeamId = decoded?.id !== undefined ? String(decoded.id) : null;

	const [meta, setMeta] = useState(null); // { isPractice, mapConfig, teams }
	const [loadError, setLoadError] = useState(null);

	useEffect(() => {
		let cancelled = false;
		if (!gameId) return undefined;
		(async () => {
			try {
				const question = await api.get(`${SERVICE_API}/question/${gameId}`);
				const cfg = question?.question_data ? JSON.parse(question.question_data) : null;
				const isPractice = !!cfg?.is_practice;
				let teams = [];
				if (isPractice && question?.match_id) {
					try {
						const m = await api.get(`${SERVICE_API}/match/${question.match_id}`);
						teams = m?.teams || [];
					} catch {
						/* teams list is only needed for the compare feature */
					}
				}
				if (!cancelled) setMeta({ isPractice, mapConfig: cfg, teams });
			} catch (e) {
				if (!cancelled) setLoadError(e.response?.data?.message || e.message);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [gameId]);

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

					{!gameId && <Typography color="error">Missing game id</Typography>}
					{gameId && loadError && <Alert severity="error">{loadError}</Alert>}
					{gameId && !loadError && !meta && <LoadingPage />}
					{gameId && meta && !meta.isPractice && <GamePlay gameId={gameId} />}
					{gameId && meta && meta.isPractice &&
						(isAdmin ? (
							<Alert severity="info">{tr({ id: "practice.adminNote" })}</Alert>
						) : (
							<PracticePlay
								questionId={gameId}
								ownTeamId={ownTeamId}
								mapConfig={meta.mapConfig}
								matchTeams={meta.teams}
							/>
						))}
				</Container>
			</Box>
		</>
	);
};

export default UserGame;
