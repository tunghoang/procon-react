import { useEffect, useMemo, useState } from "react";
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
	Stack,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useIntl } from "react-intl";
import { getPracticePeerReplay, getGameError, copyPractice } from "../../api/gameService";
import { showMessage } from "../../api/commons";
import HexBoard from "./hex-board";
import LoadingPage from "../loading-page";

// End-of-day-X board data for one team, pulled from that team's replay: the
// last frame of day X = the team's state at the end of that day.
const dayEndBoard = (replay, day, color) => {
	const d = replay?.days?.find((x) => x.day === day);
	if (!d || !d.teams?.length) return null;
	const team = d.teams[0]; // solo practice game -> one team
	const frame = team.frames[team.frames.length - 1];
	return {
		roadByCell: d.road_condition || {},
		servings: frame.servings,
		teams: [
			{
				teamId: team.team_id,
				label: `#${team.team_id}`,
				color,
				agents: frame.agents.map((a) => ({
					cell: a.cell,
					kind: a.type === "refuel" ? 1 : 0,
					trail: [],
				})),
			},
		],
	};
};

/**
 * Compare the calling team's practice state at day X against another team's,
 * and (if worth learning from) FORK the other team's progress through day X
 * into your own game -- your days after X then reset for you to replay.
 */
const PracticeCompareDialog = ({
	open,
	onClose,
	questionId,
	ownTeamId,
	ownGameId,
	otherTeams,
	totalDays,
	mapConfig,
	onCopied,
}) => {
	const { formatMessage: tr } = useIntl();
	const [otherTeamId, setOtherTeamId] = useState(null);
	const [ownReplay, setOwnReplay] = useState(null);
	const [otherReplay, setOtherReplay] = useState(null);
	const [day, setDay] = useState(0);
	const [error, setError] = useState(null);
	const [copying, setCopying] = useState(false);

	useEffect(() => {
		if (!open) return;
		setOtherTeamId(otherTeams?.[0]?.id ?? null);
		setOwnReplay(null);
		setOtherReplay(null);
		setDay(0);
		setError(null);
	}, [open, otherTeams]);

	useEffect(() => {
		if (!open) return;
		getPracticePeerReplay(ownGameId).then(setOwnReplay).catch((e) => setError(getGameError(e)));
	}, [open, ownGameId]);

	useEffect(() => {
		if (!open || otherTeamId == null) return;
		setOtherReplay(null);
		getPracticePeerReplay(`${questionId}:${otherTeamId}`)
			.then(setOtherReplay)
			.catch((e) => setError(getGameError(e)));
	}, [open, otherTeamId, questionId]);

	// Days both teams have resolved (can only compare/copy up to there).
	const maxDay = useMemo(() => {
		const own = ownReplay?.days?.length ?? 0;
		const other = otherReplay?.days?.length ?? 0;
		return Math.min(own, other) - 1; // highest common resolved day index
	}, [ownReplay, otherReplay]);

	useEffect(() => {
		if (maxDay >= 0 && day > maxDay) setDay(maxDay);
	}, [maxDay, day]);

	const ownBoard = useMemo(() => dayEndBoard(ownReplay, day, "#1976d2"), [ownReplay, day]);
	const otherBoard = useMemo(() => dayEndBoard(otherReplay, day, "#ef6c00"), [otherReplay, day]);

	const handleCopy = async () => {
		setCopying(true);
		try {
			await copyPractice(ownGameId, `${questionId}:${otherTeamId}`, otherTeamId, day);
			showMessage(tr({ id: "practice.copied" }), "success");
			onCopied?.();
		} catch (e) {
			showMessage(getGameError(e), "error", 5000);
		} finally {
			setCopying(false);
		}
	};

	const otherName =
		otherTeams?.find((t) => String(t.id) === String(otherTeamId))?.name ?? otherTeamId;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				{tr({ id: "practice.compareTitle" })}
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{error && <Alert severity="error">{error}</Alert>}

				{/* pick the team to compare with */}
				<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap sx={{ mb: 1 }}>
					<Typography variant="body2" color="textSecondary">
						{tr({ id: "practice.compareWith" })}:
					</Typography>
					{(otherTeams || []).map((t) => (
						<Chip
							key={t.id}
							size="small"
							label={t.name}
							color={String(t.id) === String(otherTeamId) ? "primary" : "default"}
							variant={String(t.id) === String(otherTeamId) ? "filled" : "outlined"}
							onClick={() => setOtherTeamId(t.id)}
						/>
					))}
				</Stack>

				{/* pick the day to compare/copy up to */}
				{maxDay >= 0 && (
					<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap sx={{ mb: 2 }}>
						<Typography variant="body2" color="textSecondary">
							{tr({ id: "hexudon.day" })}:
						</Typography>
						{Array.from({ length: maxDay + 1 }, (_, d) => (
							<Chip
								key={d}
								size="small"
								label={d + 1}
								color={d === day ? "primary" : "default"}
								variant={d === day ? "filled" : "outlined"}
								onClick={() => setDay(d)}
							/>
						))}
					</Stack>
				)}

				{(!ownReplay || !otherReplay) && <LoadingPage />}

				{ownReplay && otherReplay && maxDay < 0 && (
					<Typography color="textSecondary">{tr({ id: "practice.noCommonDay" })}</Typography>
				)}

				{ownBoard && otherBoard && (
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, md: 6 }}>
							<Typography variant="subtitle2" gutterBottom>
								{tr({ id: "practice.you" })} · {tr({ id: "hexudon.standings.servings" })}:{" "}
								{ownBoard.servings}
							</Typography>
							<HexBoard
								mapConfig={mapConfig}
								replayTeams={ownBoard.teams}
								roadByCell={ownBoard.roadByCell}
								radius={12}
							/>
						</Grid>
						<Grid size={{ xs: 12, md: 6 }}>
							<Typography variant="subtitle2" gutterBottom>
								{otherName} · {tr({ id: "hexudon.standings.servings" })}: {otherBoard.servings}
							</Typography>
							<HexBoard
								mapConfig={mapConfig}
								replayTeams={otherBoard.teams}
								roadByCell={otherBoard.roadByCell}
								radius={12}
							/>
						</Grid>
					</Grid>
				)}
			</DialogContent>
			<DialogActions>
				<Typography variant="caption" color="textSecondary" sx={{ mr: "auto", ml: 1 }}>
					{tr({ id: "practice.copyNote" })}
				</Typography>
				<Button onClick={onClose}>{tr({ id: "Close" })}</Button>
				<Button
					variant="contained"
					startIcon={<ContentCopyIcon />}
					disabled={copying || maxDay < 0 || otherTeamId == null}
					onClick={handleCopy}
				>
					{tr({ id: "practice.copyThrough" })} {tr({ id: "hexudon.day" })} {day + 1}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PracticeCompareDialog;
