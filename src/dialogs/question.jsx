import {
	Dialog,
	DialogTitle,
	DialogContent,
	TextField,
	DialogActions,
	Button,
	Stack,
	Autocomplete,
	Tabs,
	Tab,
	Box,
	Grid,
	Alert,
	Chip,
	IconButton,
	Typography,
	Select,
	MenuItem,
	InputLabel,
	FormControl,
	CircularProgress,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { DateTimePicker } from "@mui/x-date-pickers";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CasinoIcon from "@mui/icons-material/Casino";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { api, showMessage } from "../api/commons";
import { SERVICE_API } from "../config/env";
import { useContext, useState, useMemo, useEffect } from "react";
import Context from "../context";
import CodeEditor from "../components/code-editor";
import { generateMap, getDifficulties, getGameError } from "../api/gameService";
import { withZeroSeconds } from "../utils/commons";
import { validateInitShape } from "../components/procon26/board-generator";
import HexBoard from "../components/procon26/hex-board";

const DIFFICULTIES = ["easy", "medium", "hard", "very_hard"];

// A {min, max, fixed} window from GET /game/difficulties -> "14" or "10-14".
const showRange = (range) => {
	if (!range) return "?";
	const fmt = (v) => Math.round(v);
	return range.fixed ? `${fmt(range.min)}` : `${fmt(range.min)}-${fmt(range.max)}`;
};

// The same window as a share of the board, e.g. {0.08, 0.08} -> "8%".
const showPercent = (range) => {
	if (!range) return "?";
	const fmt = (v) => `${Math.round(v * 100)}%`;
	return range.fixed ? fmt(range.min) : `${Math.round(range.min * 100)}-${fmt(range.max)}`;
};

const useStyles = makeStyles({
	root: {
		minWidth: "900px",
	},
});

/**
 * Question create/edit dialog. Creation generates a rule-valid HEXUDON board
 * SERVER-SIDE (POST /game/generate, wrapping procon26-hexudon's map_gen.py --
 * BFS-verified connectivity, Dijkstra-derived fuel/step bounds) and stores
 * the full /game/init body as raw_questions — the team manager persists it
 * and registers the game. Boards are immutable once created (the game
 * service fixes them at /game/init time): edit mode only changes
 * name/description.
 */
const QuestionDialog = ({ open, instance, close, save, handleChange }) => {
	const classes = useStyles();
	const { round } = useContext(Context);
	const { formatMessage: tr } = useIntl();
	const [tabValue, setTabValue] = useState(0);
	const { data: matches } = useFetchData({
		path: "/match",
		config: {
			params: {
				eq_round_id: round?.id,
			},
		},
	});

	const [genParams, setGenParams] = useState({
		difficulty: "medium",
		// Absolute Day-1 start time (a Date). Defaults to 2 min out, and to the
		// match's own start_time once the match loads (below). The days run
		// continuously from here; the match end is simply start + total day time.
		// Truncated to the whole minute: the picker can only edit hours/minutes,
		// so a stray :47 from `Date.now()` would silently offset the whole match
		// schedule (see withZeroSeconds).
		starts_at: withZeroSeconds(new Date(Date.now() + 2 * 60 * 1000)),
		// Default the map seed to the current timestamp (ms) so every new
		// question gets a fresh, unique board without the admin clicking the
		// dice. Re-seeded each time the dialog opens (below); the dice still
		// re-rolls, and after Generate the field shows the seed actually used.
		seed: Date.now(),
		// Agent-kind selection window, in seconds AFTER starts_at. Prefilled
		// from the chosen difficulty (map_gen's agent_selection_time_limit) once
		// the tier specs load; 0 keeps Day 1 starting exactly at starts_at.
		selection_seconds: 0,
	});
	const [generating, setGenerating] = useState(false);
	const [difficultySpecs, setDifficultySpecs] = useState(null);
	const [matchTeams, setMatchTeams] = useState(null);
	const [manualText, setManualText] = useState("");
	const [manualErrors, setManualErrors] = useState([]);

	useEffect(() => {
		if (open) {
			setTabValue(0);
			setManualText("");
			setManualErrors([]);
			// Fresh unique seed per dialog open, so consecutive new questions
			// don't all regenerate the same board.
			setGenParams((prev) => ({ ...prev, seed: Date.now() }));
		}
	}, [open]);

	// What each tier actually produces (map_gen.py's DIFFICULTY_CONFIGS, served
	// by GET /game/difficulties). Fetched instead of hard-coded so re-tuning the
	// generator doesn't need a frontend change. Fetched once and then cached for
	// the session; a failure (or a service without the endpoint) just leaves the
	// summary hidden and is retried the next time the dialog opens.
	useEffect(() => {
		if (!open || difficultySpecs) return undefined;
		let cancelled = false;
		(async () => {
			try {
				const response = await getDifficulties();
				if (!cancelled) setDifficultySpecs(response?.difficulties || []);
			} catch {
				// Leave it unset: the summary is informational, and the deps stay
				// unchanged so this does not spin.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, difficultySpecs]);

	const activeSpec = useMemo(
		() => (difficultySpecs || []).find((d) => d.name === genParams.difficulty) || null,
		[difficultySpecs, genParams.difficulty],
	);

	// Adopt the tier's own agent-selection window whenever the tier changes. It
	// used to be hard-coded to 0 here, so map_gen's agent_selection_time_limit
	// (60/45/45/30 s) never reached the engine no matter what it was set to. An
	// admin edit sticks until the difficulty is changed again.
	useEffect(() => {
		if (!activeSpec || activeSpec.selectionSeconds == null) return;
		setGenParams((prev) => ({
			...prev,
			selection_seconds: Math.round(activeSpec.selectionSeconds),
		}));
	}, [activeSpec]);

	// The game's team roster is frozen at creation — fetch the match's teams
	// so Generate can bake them into the init body.
	useEffect(() => {
		let cancelled = false;
		setMatchTeams(null);
		if (!instance?.match_id) return undefined;
		(async () => {
			try {
				// Single-object endpoint — api.get returns the match body.
				const match = await api.get(`${SERVICE_API}/match/${instance.match_id}`);
				if (!cancelled) {
					setMatchTeams(match?.teams || []);
					// Default the Day-1 start to the match's own start_time so
					// setting it on the match flows straight into the game. Zeroed
					// to the minute: a match created without touching its own picker
					// took start_time from the model's NOW() default and carries the
					// second it happened to be created at.
					if (match?.start_time) {
						setGenParams((prev) => ({
							...prev,
							starts_at: withZeroSeconds(new Date(match.start_time)),
						}));
					}
				}
			} catch {
				if (!cancelled) setMatchTeams([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [instance?.match_id]);

	const changeGenParam = (key) => (evt) =>
		setGenParams((prev) => ({ ...prev, [key]: evt.target.value }));

	const changeGenNumber = (key) => (evt) =>
		setGenParams((prev) => ({ ...prev, [key]: parseInt(evt.target.value, 10) || 0 }));

	// Once a board has been generated, daySteps/daySeconds are edited directly
	// on the stored raw_questions (days still always run back-to-back -- the
	// docs' "no gap between days" rule isn't negotiable -- but each day's own
	// duration stays independently adjustable instead of locked to whatever
	// map_gen.py randomized).
	const generatedMap = instance?.raw_questions?.map;
	const dayStepBounds = generatedMap
		? { min: generatedMap.width + generatedMap.height, max: 4 * (generatedMap.width + generatedMap.height) }
		: null;

	const changeGeneratedDay = (index, key) => (evt) => {
		const value = Math.max(0, parseInt(evt.target.value, 10) || 0);
		const arrKey = key === "steps" ? "daySteps" : "daySeconds";
		const nextArr = instance.raw_questions[arrKey].map((v, i) => (i === index ? value : v));
		handleChange({ raw_questions: { ...instance.raw_questions, [arrKey]: nextArr } });
	};

	const handleGenerateBoard = async () => {
		if (!instance?.match_id) {
			showMessage(tr({ id: "questions.selectMatchFirst" }), "error", 4000);
			return;
		}
		if (!matchTeams?.length) {
			showMessage(tr({ id: "questions.matchHasNoTeams" }), "error", 4000);
			return;
		}
		setGenerating(true);
		try {
			// Server-side generation (map_gen.py): BFS-verified connectivity,
			// Dijkstra-derived fuel/step bounds, difficulty-tuned randomization
			// -- not duplicated in JS. Every team gets the same start cluster
			// (docs: identical starting layout for every team), so remapping to
			// the match's real teams just copies the first team's agents.
			const response = await generateMap(genParams.difficulty, matchTeams.length, genParams.seed);
			if (!response?.teams?.[0]?.agents?.length) {
				throw new Error("map generation returned no teams");
			}
			const sharedAgents = response.teams[0].agents;
			// The single point where a start time reaches the engine: pin it to the
			// whole minute the admin actually chose. The picker edits only hours and
			// minutes but keeps whatever seconds its value had, and every deadline
			// downstream (the agent-kind window, each day's response deadline) is
			// anchored on this instant.
			const startsAt = withZeroSeconds(genParams.starts_at);
			const startsAtSec = startsAt ? Math.floor(startsAt.getTime() / 1000) : NaN;
			if (!Number.isFinite(startsAtSec)) {
				throw new Error("invalid start time");
			}
			const init = {
				...response,
				// Absolute Day-1 start chosen by the admin (defaults to the match's
				// start_time). Days run continuously from here; the match "end" is
				// simply startsAt + the sum of the day durations.
				startsAt: startsAtSec,
				// Agent-kind window, in seconds after startsAt: the engine closes
				// selection at startsAt + this and opens Day 1 there. Teams may also
				// pick during the whole lead-in (now .. startsAt) -- the engine puts
				// no lower bound on selection -- so this is the extra window they get
				// once the match opens. 0 = Day 1 starts exactly at startsAt.
				agent_selection_time_limit: Math.max(
					0,
					Number(genParams.selection_seconds) || 0,
				),
				teams: matchTeams.map((t) => ({ team_id: String(t.id), agents: sharedAgents })),
			};
			delete init.game_id; // meaningless until the question is actually created
			setGenParams((prev) => ({ ...prev, seed: response.seed }));
			handleChange({ type: "hexudon", raw_questions: init });
			showMessage(tr({ id: "questions.boardGenerated" }), "success");
		} catch (e) {
			showMessage(getGameError(e), "error", 6000);
		} finally {
			setGenerating(false);
		}
	};

	const handleManualApply = () => {
		try {
			const parsed = JSON.parse(manualText);
			const problems = validateInitShape(parsed);
			setManualErrors(problems);
			if (problems.length) return;
			handleChange({ type: "hexudon", raw_questions: parsed });
			showMessage(tr({ id: "questions.manualApplied" }), "success");
		} catch (e) {
			setManualErrors([`JSON: ${e.message}`]);
		}
	};

	// Preview accepts the official init shape ({map:{cells}, spots, ...}),
	// either freshly generated (raw_questions) or stored (question_data).
	const hexudonPreview = useMemo(() => {
		let board = instance?.raw_questions;
		if ((!board || !board.map) && instance?.question_data) {
			try {
				board = JSON.parse(instance.question_data);
			} catch {
				board = null;
			}
		}
		if (!board?.map?.cells) return null;
		return board;
	}, [instance?.raw_questions, instance?.question_data]);

	const startsAtLabel = instance?.raw_questions?.startsAt
		? new Date(instance.raw_questions.startsAt * 1000).toLocaleString()
		: null;
	// startsAt IS Day 1's opening; the agent-kind window is the N seconds BEFORE
	// it (engine: selection_start_time = start_time - limit, and selection is
	// refused both before that and after startsAt). Show when teams may start
	// choosing, since that instant is not visible anywhere else.
	const selectionWindowSeconds = instance?.raw_questions?.agent_selection_time_limit;
	const selectionOpensLabel =
		instance?.raw_questions?.startsAt && selectionWindowSeconds
			? new Date(
					(instance.raw_questions.startsAt - selectionWindowSeconds) * 1000,
				).toLocaleString()
			: null;

	return (
		<Dialog classes={{ paperScrollPaper: classes.root }} open={open} onClose={close}>
			<DialogTitle>
				{instance?.id ? tr({ id: "questions.editTitle" }) : tr({ id: "questions.createTitle" })}
			</DialogTitle>
			<DialogContent className={classes.root}>
				<Stack spacing={1}>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 6 }}>
								<TextField
									margin="dense"
									label={tr({ id: "name" })}
									type="text"
									fullWidth
									variant="standard"
									name="name"
									value={instance?.name || ""}
									onChange={(evt) => {
										handleChange({ name: evt.target.value });
									}}
								/>
							</Grid>
							<Grid size={{ xs: 6 }}>
								<Autocomplete
									options={matches}
									value={matches.find((item) => item.id === instance.match_id) || null}
									getOptionLabel={(option) => option.name}
									isOptionEqualToValue={(option, value) => option.id === value.id}
									disabled={!!instance?.id}
									renderInput={(params) => (
										<TextField {...params} label={tr({ id: "match" })} variant="standard" />
									)}
									onChange={(evt, v) => handleChange({ match_id: v?.id })}
								/>
							</Grid>
						</Grid>
					</Box>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12 }}>
								<TextField
									margin="dense"
									label={tr({ id: "description" })}
									type="text"
									fullWidth
									variant="standard"
									name="description"
									value={instance?.description || ""}
									onChange={(evt) => {
										handleChange({ description: evt.target.value });
									}}
								/>
							</Grid>
						</Grid>
					</Box>

					{instance?.id ? (
						<Box>
							<Alert severity="warning" sx={{ mb: 2 }}>
								{tr({ id: "questions.boardImmutable" })}
							</Alert>
							{hexudonPreview && <HexBoard mapConfig={hexudonPreview} radius={9} />}
						</Box>
					) : (
						<Box>
							<Tabs value={tabValue} onChange={(evt, v) => setTabValue(v)}>
								<Tab label={tr({ id: "questions.tabGenerate" })} />
								<Tab label={tr({ id: "questions.tabManual" })} />
							</Tabs>
							<Box sx={{ mt: 2 }}>
								{tabValue === 0 && (
									<Stack spacing={2}>
										<Grid container spacing={2}>
											<Grid size={{ xs: 3 }}>
												<FormControl fullWidth size="small">
													<InputLabel>{tr({ id: "questions.difficulty" })}</InputLabel>
													<Select
														label={tr({ id: "questions.difficulty" })}
														value={genParams.difficulty}
														onChange={changeGenParam("difficulty")}
													>
														{DIFFICULTIES.map((d) => (
															<MenuItem key={d} value={d}>
																{tr({ id: `questions.difficulty.${d}` })}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											</Grid>
											<Grid size={{ xs: 3 }}>
												<DateTimePicker
													label={tr({ id: "questions.startTime" })}
													value={genParams.starts_at}
													onChange={(v) =>
														setGenParams((prev) => ({
															...prev,
															starts_at: withZeroSeconds(v),
														}))
													}
													slotProps={{ textField: { size: "small", fullWidth: true } }}
												/>
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField
													label={tr({ id: "questions.selectionSeconds" })}
													type="number"
													size="small"
													fullWidth
													value={genParams.selection_seconds}
													onChange={changeGenNumber("selection_seconds")}
													helperText={tr({ id: "questions.selectionHint" })}
													inputProps={{ min: 0 }}
												/>
											</Grid>
											<Grid size={{ xs: 2 }}>
												<Stack direction="row" spacing={0.5} alignItems="center">
													<TextField label="Seed" type="number" fullWidth size="small"
														value={genParams.seed} onChange={changeGenNumber("seed")} />
													<IconButton
														size="small"
														title={tr({ id: "questions.randomSeed" })}
														onClick={() =>
															setGenParams((prev) => ({
																...prev,
																seed: Math.floor(Math.random() * 1_000_000),
															}))
														}
													>
														<CasinoIcon fontSize="small" />
													</IconButton>
												</Stack>
											</Grid>
											<Grid size={{ xs: 2 }} sx={{ display: "flex", alignItems: "center" }}>
												<Button
													variant="contained"
													fullWidth
													onClick={handleGenerateBoard}
													disabled={generating}
													startIcon={generating ? <CircularProgress size={16} color="inherit" /> : null}
												>
													{tr({ id: "questions.generateBoard" })}
												</Button>
											</Grid>
										</Grid>

										{/* What the selected tier will produce, read from the
										generator itself (GET /game/difficulties) so it stays
										true after map_gen.py is re-tuned. The exact daySteps /
										fuel of a generated board are randomized inside their
										spec windows and appear below after Generate. */}
										{activeSpec && (
											<Stack spacing={0.5}>
												<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
													<Typography variant="caption" color="textSecondary">
														{tr({ id: "questions.difficultySpec" })}:
													</Typography>
													{[
														[tr({ id: "questions.mapSize" }), `${showRange(activeSpec.width)}x${showRange(activeSpec.height)}`],
														[tr({ id: "questions.days" }), showRange(activeSpec.days)],
														[tr({ id: "questions.secondsPerDay" }), showRange(activeSpec.daySeconds)],
														[tr({ id: "questions.agents" }), showRange(activeSpec.agents)],
														[tr({ id: "questions.spots" }), showRange(activeSpec.spots)],
														[tr({ id: "questions.brands" }), showRange(activeSpec.brands)],
														[tr({ id: "questions.stocks" }), showRange(activeSpec.stocks)],
													].map(([label, value]) => (
														<Chip key={label} size="small" variant="outlined" label={`${label}: ${value}`} />
													))}
												</Stack>
												<Typography variant="caption" color="textSecondary">
													{tr({ id: "questions.terrainMix" })}:{" "}
													{showPercent(activeSpec.pondRatio)} / {showPercent(activeSpec.roadRatio)} /{" "}
													{showPercent(activeSpec.mountainRatio)}
												</Typography>
											</Stack>
										)}

										{/* Per-day duration, populated from what map_gen.py generated --
										days still always run back-to-back (no gaps: the docs rule
										isn't negotiable), but each day's own steps/response time stay
										independently adjustable afterward. */}
										{dayStepBounds && (
											<Box sx={{ overflowX: "auto" }}>
												<Stack direction="row" spacing={1}>
													{instance.raw_questions.daySteps.map((steps, index) => (
														<Stack key={index} spacing={0.5} sx={{ minWidth: 110 }}>
															<Typography variant="caption" color="textSecondary" align="center">
																{tr({ id: "questions.dayLabel" })} {index + 1}
															</Typography>
															<TextField
																label={tr({ id: "questions.stepsPerDay" })}
																type="number" size="small"
																value={steps}
																onChange={changeGeneratedDay(index, "steps")}
																helperText={`${dayStepBounds.min}-${dayStepBounds.max}`}
																inputProps={{ min: dayStepBounds.min, max: dayStepBounds.max }}
															/>
															<TextField
																label={tr({ id: "questions.secondsPerDay" })}
																type="number" size="small"
																value={instance.raw_questions.daySeconds[index]}
																onChange={changeGeneratedDay(index, "response_time")}
																inputProps={{ min: 1 }}
															/>
														</Stack>
													))}
												</Stack>
											</Box>
										)}

										{instance?.match_id && matchTeams !== null && (
											<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
												<Chip
													size="small"
													color={matchTeams.length ? "success" : "error"}
													label={`${tr({ id: "questions.teamsInMatch" })}: ${matchTeams.length}`}
												/>
												{matchTeams.map((t) => (
													<Chip key={t.id} size="small" variant="outlined" label={t.name} />
												))}
											</Stack>
										)}
										{hexudonPreview ? (
											<>
												{startsAtLabel && (
													<Alert severity="info">
														{tr({ id: "questions.startsAtLabel" })}: {startsAtLabel}
														{selectionOpensLabel && (
															<>
																{" — "}
																{tr(
																	{ id: "questions.selectionOpensAt" },
																	{ seconds: Math.round(selectionWindowSeconds) },
																)}
																: {selectionOpensLabel}
															</>
														)}
													</Alert>
												)}
												<HexBoard mapConfig={hexudonPreview} radius={9} />
											</>
										) : (
											<Alert severity="info">{tr({ id: "questions.generateHint" })}</Alert>
										)}
									</Stack>
								)}
								{tabValue === 1 && (
									<Stack spacing={1}>
										<Alert severity="info">{tr({ id: "questions.manualHint" })}</Alert>
										<TextField
											label={tr({ id: "questions.manualLabel" })}
											multiline
											rows={10}
											fullWidth
											variant="outlined"
											placeholder='{"startsAt": ..., "daySeconds": [...], "daySteps": [...], "map": {...}, "spots": [...], "fuelLimits": ..., "players": ..., "busyThreshold": ..., "jammedThreshold": ..., "teams": [...], "agent_selection_time_limit": ...}'
											value={manualText}
											onChange={(evt) => setManualText(evt.target.value)}
										/>
										{manualErrors.length > 0 && (
											<Alert severity="error">
												{manualErrors.map((problem, i) => (
													<div key={i}>{problem}</div>
												))}
											</Alert>
										)}
										<Stack direction="row" spacing={1}>
											<Button variant="outlined" onClick={handleManualApply}>
												{tr({ id: "questions.manualApply" })}
											</Button>
											<IconButton
												size="small"
												title={tr({ id: "questions.copyData" })}
												onClick={() => {
													const text = instance?.raw_questions
														? JSON.stringify(instance.raw_questions)
														: "";
													if (text) {
														navigator.clipboard.writeText(text);
														showMessage(tr({ id: "common.copied" }), "success");
													}
												}}
											>
												<ContentCopyIcon fontSize="small" />
											</IconButton>
										</Stack>
										{hexudonPreview && <HexBoard mapConfig={hexudonPreview} radius={9} />}
									</Stack>
								)}
							</Box>
						</Box>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
				<Button
					onClick={save}
					disabled={!instance?.id && !instance?.raw_questions?.map}
				>
					{tr({ id: "Save" })}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

const QuestionDataDialog = ({
	open,
	instance,
	close,
	title = "Question Data",
	disabled = false,
}) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();

	const questionData = useMemo(() => {
		return JSON.parse(instance?.question_data || "{}");
	}, [instance?.question_data]);

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}
			slotProps={{ transition: { timeout: 0 } }}
			disableScrollLock>
			<DialogTitle></DialogTitle>
			<DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<Stack spacing={1}>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12 }}>
								<TextField
									margin="dense"
									label={tr({ id: "description" })}
									type="text"
									fullWidth
									variant="standard"
									value={instance?.description || ""}
									InputProps={{
										readOnly: true,
									}}
								/>
							</Grid>
						</Grid>
					</Box>
					{questionData?.map?.cells && (
						<HexBoard mapConfig={questionData} radius={9} />
					)}
					<CodeEditor title={title} defaultValue={{ ...questionData }} readOnly={disabled} />
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { QuestionDialog, QuestionDataDialog };
