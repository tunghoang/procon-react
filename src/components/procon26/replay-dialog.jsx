import { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Slider,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tabs,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { useIntl } from "react-intl";
import {
	getGameReplay,
	getGameError,
	getPracticePeerReplay,
} from "../../api/gameService";
import HexBoard from "./hex-board";
import LoadingPage from "../loading-page";

const TEAM_COLORS = [
	"#1976d2",
	"#8e24aa",
	"#ef6c00",
	"#00838f",
	"#c2185b",
	"#5d4037",
];
// Distinct palette for opponents' final-position markers (kept away from the
// own-team blue at TEAM_COLORS[0]).
const OPPONENT_COLORS = ["#8e24aa", "#ef6c00", "#00838f", "#c2185b", "#5d4037"];
const PLAY_INTERVAL_MS = 700;

/**
 * Step-by-step replay viewer. Fetches the server's authoritative per-day
 * frames and animates them: a day selector, a step slider, and play/pause.
 * Teams can be filtered (checkbox multi-select, or click a team's label to
 * view it alone) -- a team's colour is stable across days/filters (keyed by
 * team_id, not by array position, since a team can join a game mid-match and
 * so isn't necessarily in every day's team list). The cells where a serving
 * was collected this step are ringed.
 */
const ReplayDialog = ({
	gameId,
	mapConfig,
	open,
	onClose,
	ownTeamId,
	opponents = null,
	questionId = null,
}) => {
	const { formatMessage: tr } = useIntl();
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [dayIndex, setDayIndex] = useState(0);
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [selectedTeamIds, setSelectedTeamIds] = useState(null); // null until data loads
	const [peerReplays, setPeerReplays] = useState({}); // {oppId: replay} — practice opponents
	const [showOpponents, setShowOpponents] = useState(true);
	const timer = useRef(null);

	useEffect(() => {
		if (!open) return;
		setData(null);
		setError(null);
		setDayIndex(0);
		setStep(0);
		setPlaying(false);
		setSelectedTeamIds(null);
		setPeerReplays({});
		getGameReplay(gameId)
			.then(setData)
			.catch((e) => setError(getGameError(e)));
	}, [open, gameId]);

	// Practice overlay: fetch each opponent's END-OF-DAY replay (the service
	// collapses peer replays to final frames only). Failures are skipped quietly
	// so one unreachable opponent never blocks the viewer.
	useEffect(() => {
		if (!open || !questionId || !opponents?.length) return;
		let cancelled = false;
		Promise.all(
			opponents.map((op) =>
				getPracticePeerReplay(`${questionId}:${op.id}`)
					.then((r) => [String(op.id), r])
					.catch(() => null),
			),
		).then((pairs) => {
			if (cancelled) return;
			setPeerReplays(Object.fromEntries(pairs.filter(Boolean)));
		});
		return () => {
			cancelled = true;
		};
	}, [open, questionId, opponents]);

	const days = data?.days || [];
	const day = days[dayIndex] || null;
	const maxStep = day ? day.steps : 0;

	// Every team_id that appears in ANY day (a team can join mid-match and so
	// isn't necessarily in every day's list), sorted for a stable order.
	const allTeamIds = useMemo(() => {
		const ids = new Set();
		days.forEach((d) => d.teams.forEach((t) => ids.add(String(t.team_id))));
		return [...ids].sort();
	}, [days]);

	// Colour keyed by team_id (not array position) so it never shifts across
	// days or when the filter hides/shows other teams.
	const colorByTeamId = useMemo(() => {
		const map = new Map();
		allTeamIds.forEach((tid, i) =>
			map.set(tid, TEAM_COLORS[i % TEAM_COLORS.length]),
		);
		return map;
	}, [allTeamIds]);

	// Default to every team selected once the replay data (and so
	// allTeamIds) is known.
	useEffect(() => {
		if (data && selectedTeamIds === null)
			setSelectedTeamIds(new Set(allTeamIds));
	}, [data, allTeamIds, selectedTeamIds]);

	const toggleTeam = (tid) =>
		setSelectedTeamIds((prev) => {
			const next = new Set(prev);
			if (next.has(tid)) next.delete(tid);
			else next.add(tid);
			return next;
		});
	const soloTeam = (tid) => setSelectedTeamIds(new Set([tid]));
	const selectAllTeams = () => setSelectedTeamIds(new Set(allTeamIds));

	const selectDay = (index) => {
		setDayIndex(index);
		setStep(0);
		setPlaying(false);
	};

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

	// Build per-team agent trails (cells visited up to the current step) +
	// current positions; also the cells collected on this exact step (ringed).
	// Only teams in selectedTeamIds are included.
	const { replayTeams, collected, perTeam } = useMemo(() => {
		if (!day || !selectedTeamIds)
			return { replayTeams: [], collected: [], perTeam: [] };
		const teamsArr = [];
		const hl = [];
		const summary = [];
		day.teams
			.filter((team) => selectedTeamIds.has(String(team.team_id)))
			.forEach((team) => {
				const color = colorByTeamId.get(String(team.team_id)) || "#999";
				const upto = team.frames.slice(
					0,
					Math.min(step, team.frames.length - 1) + 1,
				);
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
				teamsArr.push({
					teamId: team.team_id,
					label: `#${team.team_id}`,
					color,
					agents,
				});
				(cur.collected || []).forEach((c) => hl.push(c));
				summary.push({
					teamId: team.team_id,
					color,
					submitted: team.submitted,
					servings: cur.servings,
					total: team.servings,
					collectedNow: (cur.collected || []).length,
					agents: cur.agents.map((a) => ({
						cell: a.cell,
						fuel: a.fuel,
						kind: a.type === "refuel" ? 1 : 0,
					})),
				});
			});
		return { replayTeams: teamsArr, collected: hl, perTeam: summary };
	}, [day, step, selectedTeamIds, colorByTeamId]);

	// Per-team stats for THIS day, for the filter row's labels -- computed
	// from the UNFILTERED day.teams (not perTeam) so a team's own label keeps
	// showing its stats even after it's unchecked; a team not yet in the
	// game on this day just shows no stats.
	const dayStatsByTeamId = useMemo(() => {
		const map = new Map();
		if (!day) return map;
		day.teams.forEach((team) => {
			const upto = team.frames.slice(
				0,
				Math.min(step, team.frames.length - 1) + 1,
			);
			const cur = upto[upto.length - 1];
			map.set(String(team.team_id), {
				submitted: team.submitted,
				servings: cur.servings,
				total: team.servings,
			});
		});
		return map;
	}, [day, step]);

	// Stable colour per opponent (practice overlay), keyed by id.
	const opponentColorById = useMemo(() => {
		const map = new Map();
		(opponents || [])
			.map((o) => String(o.id))
			.sort()
			.forEach((id, i) => map.set(id, OPPONENT_COLORS[i % OPPONENT_COLORS.length]));
		return map;
	}, [opponents]);

	// Opponents' final position for the SELECTED day (matched by day number, not
	// array index) -- a static end-of-day marker, never a step-by-step route.
	const finalTeams = useMemo(() => {
		if (!day || !showOpponents) return null;
		const out = [];
		(opponents || []).forEach((op) => {
			const rep = peerReplays[String(op.id)];
			const d = rep?.days?.find((x) => x.day === day.day);
			const teamDay = d?.teams?.[0];
			const frame = teamDay?.frames?.[teamDay.frames.length - 1];
			if (!frame) return;
			out.push({
				teamId: op.id,
				label: op.name || `#${op.id}`,
				color: opponentColorById.get(String(op.id)) || "#8e24aa",
				agents: frame.agents.map((a) => ({
					cell: a.cell,
					kind: a.type === "refuel" ? 1 : 0,
				})),
			});
		});
		return out.length ? out : null;
	}, [day, showOpponents, opponents, peerReplays, opponentColorById]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}>
				{tr({ id: "hexudon.replay.title" })}
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{error && <Alert severity="error">{error}</Alert>}
				{!error && !data && <LoadingPage />}
				{!error && data && days.length === 0 && (
					<Typography color="textSecondary">
						{tr({ id: "hexudon.replay.empty" })}
					</Typography>
				)}
				{day && (
					<Stack spacing={2}>
						<Tabs
							value={dayIndex}
							onChange={(e, v) => selectDay(v)}
							variant="scrollable"
							scrollButtons="auto">
							{days.map((d, i) => (
								<Tab
									key={d.day}
									label={`${tr({ id: "hexudon.day" })} ${d.day}`}
									value={i}
								/>
							))}
						</Tabs>

						<Stack direction="row" spacing={1} alignItems="center">
							<IconButton
								aria-label={tr({ id: "hexudon.replay.first" })}
								onClick={() => {
									setPlaying(false);
									setStep(0);
								}}>
								<SkipPreviousIcon />
							</IconButton>
							<IconButton
								aria-label={tr({
									id: playing ? "hexudon.replay.pause" : "hexudon.replay.play",
								})}
								color="primary"
								onClick={() => {
									if (step >= maxStep) setStep(0);
									setPlaying((p) => !p);
								}}>
								{playing ? <PauseIcon /> : <PlayArrowIcon />}
							</IconButton>
							<IconButton
								aria-label={tr({ id: "hexudon.replay.last" })}
								onClick={() => {
									setPlaying(false);
									setStep(maxStep);
								}}>
								<SkipNextIcon />
							</IconButton>
							<Slider
								value={step}
								min={0}
								max={maxStep}
								step={1}
								marks
								valueLabelDisplay="auto"
								onChange={(e, v) => {
									setPlaying(false);
									setStep(v);
								}}
								sx={{ mx: 2, flex: 1 }}
							/>
							<Typography
								variant="body2"
								sx={{
									minWidth: 90,
									textAlign: "right",
									fontVariantNumeric: "tabular-nums",
								}}>
								{tr({ id: "hexudon.replay.step" })} {step}/{maxStep}
							</Typography>
						</Stack>

						{/* Team filter: checkbox toggles multi-select inclusion; clicking
						a team's label shows that team alone. Colour is keyed by
						team_id, stable across days even when a team joined late or is
						currently filtered out. */}
						<Stack
							direction="row"
							spacing={1}
							flexWrap="wrap"
							alignItems="center"
							useFlexGap>
							{allTeamIds.map((tid) => {
								const color = colorByTeamId.get(tid);
								const checked = selectedTeamIds?.has(tid) ?? true;
								const t = dayStatsByTeamId.get(tid);
								return (
									<Stack
										key={tid}
										direction="row"
										spacing={0}
										alignItems="center"
										sx={{
											border: 2,
											borderColor: color,
											borderRadius: 4,
											pr: 1,
											opacity: checked ? 1 : 0.45,
										}}>
										<Checkbox
											size="small"
											checked={checked}
											onChange={() => toggleTeam(tid)}
											sx={{ p: 0.5, color, "&.Mui-checked": { color } }}
										/>
										<Box
											component="button"
											type="button"
											onClick={() => soloTeam(tid)}
											title={tr({ id: "hexudon.replay.soloHint" })}
											sx={{
												border: 0,
												background: "none",
												cursor: "pointer",
												p: 0,
												font: "inherit",
												textAlign: "left",
											}}>
											<Typography variant="caption" component="span">
												{tr({ id: "hexudon.answers.team" })} {tid}
												{String(tid) === String(ownTeamId)
													? ` (${tr({ id: "hexudon.standings.you" })})`
													: ""}
												{t
													? ` · ${tr({ id: "hexudon.standings.servings" })}: ${t.servings}/${t.total}${
															t.submitted
																? ""
																: ` · ${tr({ id: "hexudon.replay.noSubmit" })}`
														}`
													: ""}
											</Typography>
										</Box>
									</Stack>
								);
							})}
							{allTeamIds.length > 1 &&
								(selectedTeamIds?.size ?? 0) < allTeamIds.length && (
									<Button size="small" onClick={selectAllTeams}>
										{tr({ id: "hexudon.replay.selectAll" })}
									</Button>
								)}
							<Box sx={{ flex: 1 }} />
							<Typography variant="caption" color="textSecondary">
								● {tr({ id: "hexudon.patrol" })} · ○{" "}
								{tr({ id: "hexudon.refuel" })}
							</Typography>
						</Stack>

						{/* Practice overlay control: opponents are shown as their
						    END-OF-DAY final position only (official rule). */}
						{opponents?.length > 0 && (
							<Stack
								direction="row"
								spacing={1}
								flexWrap="wrap"
								alignItems="center"
								useFlexGap>
								<Box
									component="label"
									sx={{
										display: "inline-flex",
										alignItems: "center",
										cursor: "pointer",
									}}>
									<Checkbox
										size="small"
										checked={showOpponents}
										onChange={(e) => setShowOpponents(e.target.checked)}
										sx={{ p: 0.5 }}
									/>
									<Typography variant="caption">
										{tr({ id: "hexudon.replay.showOpponents" })}
									</Typography>
								</Box>
								{showOpponents &&
									opponents.map((op) => (
										<Stack
											key={op.id}
											direction="row"
											spacing={0.5}
											alignItems="center">
											<Box
												sx={{
													width: 11,
													height: 11,
													border: `2px dashed ${opponentColorById.get(String(op.id)) || "#8e24aa"}`,
													transform: "rotate(45deg)",
												}}
											/>
											<Typography variant="caption">
												{op.name || `#${op.id}`}
												{peerReplays[String(op.id)]
													? ""
													: ` (${tr({ id: "hexudon.replay.noData" })})`}
											</Typography>
										</Stack>
									))}
							</Stack>
						)}

						{/* Per-step stats table: updates as the step slider moves,
						    showing each (selected) team's state AT THIS STEP. */}
						{perTeam.length > 0 && (
							<Box sx={{ overflowX: "auto" }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>
												{tr({ id: "hexudon.answers.team" })}
											</TableCell>
											<TableCell align="right">
												{tr({ id: "hexudon.standings.servings" })}
											</TableCell>
											<TableCell align="right">
												{tr({ id: "hexudon.replay.collectedNow" })}
											</TableCell>
											<TableCell>
												{tr({ id: "hexudon.replay.agentsFuel" })}
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{perTeam.map((t) => (
											<TableRow key={t.teamId}>
												<TableCell>
													<Stack
														direction="row"
														spacing={0.5}
														alignItems="center">
														<Box
															component="span"
															sx={{
																width: 10,
																height: 10,
																borderRadius: "50%",
																bgcolor: t.color,
															}}
														/>
														<span>
															{t.teamId}
															{String(t.teamId) === String(ownTeamId)
																? ` (${tr({ id: "hexudon.standings.you" })})`
																: ""}
														</span>
													</Stack>
												</TableCell>
												<TableCell
													align="right"
													sx={{ fontVariantNumeric: "tabular-nums" }}>
													{t.servings}/{t.total}
												</TableCell>
												<TableCell
													align="right"
													sx={{ fontVariantNumeric: "tabular-nums" }}>
													{t.collectedNow > 0 ? `+${t.collectedNow}` : "—"}
												</TableCell>
												<TableCell>
													<Stack
														direction="row"
														spacing={0.5}
														flexWrap="wrap"
														useFlexGap>
														{t.agents.map((a, ai) => (
															<Chip
																key={ai}
																size="small"
																variant="outlined"
																label={`#${ai} ${
																	a.kind === 0
																		? `${tr({ id: "hexudon.patrol" })} ⛽${a.fuel}`
																		: tr({ id: "hexudon.refuel" })
																}`}
															/>
														))}
													</Stack>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Box>
						)}

						<HexBoard
							mapConfig={mapConfig}
							replayTeams={replayTeams}
							finalTeams={finalTeams}
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
