import { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Slider,
	Stack,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { useIntl } from "react-intl";
import { getGameReplay, getGameError } from "../../api/gameService";
import HexBoard from "./hex-board";
import LoadingPage from "../loading-page";

const TEAM_COLORS = ["#1976d2", "#8e24aa", "#ef6c00", "#00838f", "#c2185b", "#5d4037"];
const PLAY_INTERVAL_MS = 700;

/**
 * Step-by-step replay viewer. Fetches the server's authoritative per-day
 * frames and animates them: a day selector, a step slider, and play/pause.
 * All teams render on one board (each a distinct colour); the cells where a
 * serving was collected this step are ringed.
 */
const ReplayDialog = ({ gameId, mapConfig, open, onClose, ownTeamId }) => {
	const { formatMessage: tr } = useIntl();
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [dayIndex, setDayIndex] = useState(0);
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(false);
	const timer = useRef(null);

	useEffect(() => {
		if (!open) return;
		setData(null);
		setError(null);
		setDayIndex(0);
		setStep(0);
		setPlaying(false);
		getGameReplay(gameId)
			.then(setData)
			.catch((e) => setError(getGameError(e)));
	}, [open, gameId]);

	const days = data?.days || [];
	const day = days[dayIndex] || null;
	const maxStep = day ? day.steps : 0;

	// Auto-advance while playing; stop at the end of the day.
	useEffect(() => {
		if (!playing || !day) return undefined;
		timer.current = setInterval(() => {
			setStep((s) => {
				if (s >= maxStep) {
					setPlaying(false);
					return s;
				}
				return s + 1;
			});
		}, PLAY_INTERVAL_MS);
		return () => clearInterval(timer.current);
	}, [playing, day, maxStep]);

	const selectDay = (index) => {
		setDayIndex(index);
		setStep(0);
		setPlaying(false);
	};

	// Build per-team agent trails (cells visited up to the current step) +
	// current positions; also the cells collected on this exact step (ringed).
	const { replayTeams, collected, perTeam } = useMemo(() => {
		if (!day) return { replayTeams: [], collected: [], perTeam: [] };
		const teamsArr = [];
		const hl = [];
		const summary = [];
		day.teams.forEach((team, ti) => {
			const color = TEAM_COLORS[ti % TEAM_COLORS.length];
			const upto = team.frames.slice(0, Math.min(step, team.frames.length - 1) + 1);
			const cur = upto[upto.length - 1];
			const agents = cur.agents.map((a, ai) => {
				// Trail = this agent's cell across the steps so far, with
				// consecutive duplicates (waits) collapsed.
				const trail = [];
				for (const f of upto) {
					const c = f.agents[ai].cell;
					if (trail[trail.length - 1] !== c) trail.push(c);
				}
				return { cell: a.cell, kind: a.type === "refuel" ? 1 : 0, trail };
			});
			teamsArr.push({ teamId: team.team_id, label: `#${team.team_id}`, color, agents });
			(cur.collected || []).forEach((c) => hl.push(c));
			summary.push({
				teamId: team.team_id,
				color,
				submitted: team.submitted,
				servings: cur.servings,
				total: team.servings,
			});
		});
		return { replayTeams: teamsArr, collected: hl, perTeam: summary };
	}, [day, step]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				{tr({ id: "hexudon.replay.title" })}
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{error && <Alert severity="error">{error}</Alert>}
				{!error && !data && <LoadingPage />}
				{!error && data && days.length === 0 && (
					<Typography color="textSecondary">{tr({ id: "hexudon.replay.empty" })}</Typography>
				)}
				{day && (
					<Stack spacing={2}>
						<Tabs
							value={dayIndex}
							onChange={(e, v) => selectDay(v)}
							variant="scrollable"
							scrollButtons="auto">
							{days.map((d, i) => (
								<Tab key={d.day} label={`${tr({ id: "hexudon.day" })} ${d.day}`} value={i} />
							))}
						</Tabs>

						<Stack direction="row" spacing={1} alignItems="center">
							<IconButton
								aria-label={tr({ id: "hexudon.replay.first" })}
								onClick={() => { setPlaying(false); setStep(0); }}>
								<SkipPreviousIcon />
							</IconButton>
							<IconButton
								aria-label={tr({ id: playing ? "hexudon.replay.pause" : "hexudon.replay.play" })}
								color="primary"
								onClick={() => {
									if (step >= maxStep) setStep(0);
									setPlaying((p) => !p);
								}}>
								{playing ? <PauseIcon /> : <PlayArrowIcon />}
							</IconButton>
							<IconButton
								aria-label={tr({ id: "hexudon.replay.last" })}
								onClick={() => { setPlaying(false); setStep(maxStep); }}>
								<SkipNextIcon />
							</IconButton>
							<Slider
								value={step}
								min={0}
								max={maxStep}
								step={1}
								marks
								valueLabelDisplay="auto"
								onChange={(e, v) => { setPlaying(false); setStep(v); }}
								sx={{ mx: 2, flex: 1 }}
							/>
							<Typography
								variant="body2"
								sx={{ minWidth: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
								{tr({ id: "hexudon.replay.step" })} {step}/{maxStep}
							</Typography>
						</Stack>

						<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
							{perTeam.map((t) => (
								<Chip
									key={t.teamId}
									size="small"
									variant="outlined"
									icon={
										<Box
											component="span"
											sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.color, ml: 1 }}
										/>
									}
									sx={{ borderColor: t.color, borderWidth: 2 }}
									label={`${tr({ id: "hexudon.answers.team" })} ${t.teamId}${
										String(t.teamId) === String(ownTeamId) ? ` (${tr({ id: "hexudon.standings.you" })})` : ""
									} · ${tr({ id: "hexudon.standings.servings" })}: ${t.servings}/${t.total}${
										t.submitted ? "" : ` · ${tr({ id: "hexudon.replay.noSubmit" })}`
									}`}
								/>
							))}
							<Box sx={{ flex: 1 }} />
							<Typography variant="caption" color="textSecondary">
								● {tr({ id: "hexudon.patrol" })} · ○ {tr({ id: "hexudon.refuel" })}
							</Typography>
						</Stack>

						<HexBoard
							mapConfig={mapConfig}
							replayTeams={replayTeams}
							roadByCell={day.road_condition}
							highlightCells={collected}
							radius={22}
						/>
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ReplayDialog;
