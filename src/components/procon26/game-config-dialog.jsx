import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useIntl } from "react-intl";
import { getGameBoardConfig, getGameError } from "../../api/gameService";
import { showMessage } from "../../api/commons";
import { copyText } from "../../utils/commons";
import LoadingPage from "../loading-page";

const Fact = ({ label, value }) => (
	<Grid size={{ xs: 6, sm: 4, md: 3 }}>
		<Typography variant="caption" color="textSecondary" display="block">
			{label}
		</Typography>
		<Typography variant="body2" fontWeight={600}>
			{value}
		</Typography>
	</Grid>
);

/**
 * Fetches and shows a game's board/match configuration (GET /game/board) --
 * map size, day count + per-day steps/seconds, fuel limit, spots, traffic
 * thresholds, plus the raw JSON. Works for a team or an admin (the endpoint is
 * team-independent).
 */
const GameConfigDialog = ({ open, onClose, gameId }) => {
	const { formatMessage: tr } = useIntl();
	const [config, setConfig] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!open || !gameId) return;
		setConfig(null);
		setError(null);
		getGameBoardConfig(gameId)
			.then(setConfig)
			.catch((e) => setError(getGameError(e)));
	}, [open, gameId]);

	const fmtTime = (epoch) => {
		if (!epoch) return "-";
		try {
			return new Date(epoch * 1000).toLocaleString();
		} catch {
			return String(epoch);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				{tr({ id: "hexudon.config.title" })}
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{error && <Alert severity="error">{error}</Alert>}
				{!config && !error && <LoadingPage />}
				{config && (
					<Stack spacing={2}>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
							<Typography variant="body2" color="textSecondary" sx={{ wordBreak: "break-all" }}>
								{config.game_id}
							</Typography>
							{config.is_practice && (
								<Chip size="small" color="info" label={tr({ id: "match.practice" })} />
							)}
						</Stack>

						<Grid container spacing={2}>
							<Fact
								label={tr({ id: "hexudon.config.mapSize" })}
								value={`${config.map.width} × ${config.map.height}`}
							/>
							<Fact label={tr({ id: "hexudon.config.players" })} value={config.players} />
							<Fact label={tr({ id: "hexudon.config.days" })} value={config.daySteps.length} />
							<Fact label={tr({ id: "hexudon.config.fuel" })} value={config.fuelLimits} />
							<Fact label={tr({ id: "hexudon.config.spots" })} value={config.spots.length} />
							<Fact
								label={tr({ id: "hexudon.config.congestion" })}
								value={`${config.busyThreshold} / ${config.jammedThreshold}`}
							/>
							<Fact
								label={tr({ id: "hexudon.config.selectTime" })}
								value={`${config.agent_selection_time_limit}s`}
							/>
							<Fact label={tr({ id: "hexudon.config.startsAt" })} value={fmtTime(config.startsAt)} />
						</Grid>

						<Box>
							<Typography variant="subtitle2" gutterBottom>
								{tr({ id: "hexudon.config.perDay" })}
							</Typography>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>{tr({ id: "hexudon.day" })}</TableCell>
										<TableCell align="right">{tr({ id: "hexudon.steps" })}</TableCell>
										<TableCell align="right">{tr({ id: "hexudon.config.seconds" })}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{config.daySteps.map((s, i) => (
										<TableRow key={i}>
											<TableCell>{i + 1}</TableCell>
											<TableCell align="right">{s}</TableCell>
											<TableCell align="right">{config.daySeconds[i]}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>

						<Box>
							<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
								<Typography variant="subtitle2">{tr({ id: "hexudon.config.raw" })}</Typography>
								<Button
									size="small"
									startIcon={<ContentCopyIcon />}
									onClick={async () => {
										if (await copyText(JSON.stringify(config))) {
											showMessage(tr({ id: "hexudon.copiedId" }), "success", 2000);
										}
									}}
								>
									{tr({ id: "questions.copyData" })}
								</Button>
							</Stack>
							<Paper
								variant="outlined"
								sx={{ p: 1.5, maxHeight: 240, overflow: "auto", fontSize: 12 }}
							>
								<pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
									{JSON.stringify(config, null, 2)}
								</pre>
							</Paper>
						</Box>
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export default GameConfigDialog;
