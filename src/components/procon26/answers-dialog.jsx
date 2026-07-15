import { useEffect, useState } from "react";
import {
	Alert,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useIntl } from "react-intl";
import { getGameActions, getGameError } from "../../api/gameService";
import { DIRECTIONS } from "./game-handler";
import LoadingPage from "../loading-page";

const commandLabel = (command, tr) =>
	command < 0
		? `${tr({ id: "hexudon.answers.wait" })} ${-command}`
		: `${DIRECTIONS[command]?.arrow ?? "?"}${DIRECTIONS[command]?.key ?? command}`;

/**
 * Read-only viewer for the adopted daily answers. The game service filters
 * visibility server-side: admins see every team's plans, but a team sees ONLY
 * its own -- another team's move steps are never disclosed, on any day.
 */
const AnswersDialog = ({ gameId, open, onClose, ownTeamId }) => {
	const { formatMessage: tr } = useIntl();
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!open) return;
		setData(null);
		setError(null);
		getGameActions(gameId)
			.then(setData)
			.catch((e) => setError(getGameError(e)));
	}, [open, gameId]);

	const actions = data?.actions || [];

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				{tr({ id: "hexudon.answers.title" })}
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{error && <Alert severity="error">{error}</Alert>}
				{!error && !data && <LoadingPage />}
				{!error && data && actions.length === 0 && (
					<Typography color="textSecondary">{tr({ id: "hexudon.answers.empty" })}</Typography>
				)}
				{actions.length > 0 && (
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{tr({ id: "hexudon.day" })}</TableCell>
								<TableCell>{tr({ id: "hexudon.answers.team" })}</TableCell>
								<TableCell>{tr({ id: "hexudon.answers.plan" })}</TableCell>
								<TableCell align="right">{tr({ id: "hexudon.submit.count" })}</TableCell>
								<TableCell>{tr({ id: "hexudon.answers.submittedAt" })}</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{actions.map((row) => (
								<TableRow key={`${row.day}-${row.team_id}`} sx={{ verticalAlign: "top" }}>
									<TableCell>{row.day}</TableCell>
									<TableCell>
										{row.team_id}
										{String(row.team_id) === String(ownTeamId)
											? ` (${tr({ id: "hexudon.standings.you" })})`
											: ""}
									</TableCell>
									<TableCell>
										<Stack spacing={0.5}>
											{(row.plan || []).map((commands, agentIndex) => (
												<Stack
													key={agentIndex}
													direction="row"
													spacing={0.5}
													alignItems="center"
													flexWrap="wrap"
													useFlexGap
												>
													<Typography variant="caption" sx={{ minWidth: 48, fontWeight: "bold" }}>
														{tr({ id: "hexudon.agent" })} {agentIndex}
													</Typography>
													{(commands || []).map((command, index) => (
														<Chip
															key={index}
															size="small"
															variant="outlined"
															label={commandLabel(command, tr)}
														/>
													))}
												</Stack>
											))}
										</Stack>
									</TableCell>
									<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{row.submit_count ?? 1}
									</TableCell>
									<TableCell>
										{row.submitted_at
											? new Date(row.submitted_at * 1000).toLocaleTimeString()
											: "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default AnswersDialog;
