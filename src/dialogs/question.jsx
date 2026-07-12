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
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CasinoIcon from "@mui/icons-material/Casino";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { api, showMessage } from "../api/commons";
import { SERVICE_API } from "../config/env";
import { useContext, useState, useMemo, useEffect } from "react";
import Context from "../context";
import CodeEditor from "../components/code-editor";
import {
	generateBoard,
	assembleInit,
	validateInitShape,
} from "../components/procon26/board-generator";
import HexBoard from "../components/procon26/hex-board";

const useStyles = makeStyles({
	root: {
		minWidth: "900px",
	},
});

/**
 * Question create/edit dialog. Creation generates a rule-valid HEXUDON board
 * CLIENT-SIDE (the game service has no /board endpoint) and stores the full
 * /game/init body as raw_questions — the team manager persists it and
 * registers the game. Boards are immutable once created (the game service
 * fixes them at /game/init time): edit mode only changes name/description.
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
		width: 10,
		height: 10,
		agents_per_team: 4,
		spot_count: 8,
		brand_count: 4,
		busy_threshold: 2,
		jam_threshold: 5,
		day_count: 4,
		// One {steps, response_time} entry per day -- days still always run
		// back-to-back (the docs' "no gap between days" rule isn't
		// negotiable), but each day's own duration is independently settable
		// instead of one value copied across every day.
		dayConfigs: Array.from({ length: 4 }, () => ({ steps: 40, response_time: 90 })),
		fuel: 80,
		agent_selection_time_limit: 120,
		starts_in_minutes: 2,
		seed: 1,
	});
	const [matchTeams, setMatchTeams] = useState(null);
	const [manualText, setManualText] = useState("");
	const [manualErrors, setManualErrors] = useState([]);

	useEffect(() => {
		if (open) {
			setTabValue(0);
			setManualText("");
			setManualErrors([]);
		}
	}, [open]);

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
				if (!cancelled) setMatchTeams(match?.teams || []);
			} catch {
				if (!cancelled) setMatchTeams([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [instance?.match_id]);

	const changeGenParam = (key) => (evt) =>
		setGenParams((prev) => ({ ...prev, [key]: parseInt(evt.target.value, 10) || 0 }));

	// Resizes dayConfigs to match a new day_count, keeping existing per-day
	// values and copying the last day's values into any newly added days.
	const changeDayCount = (evt) => {
		const n = Math.max(4, Math.min(10, parseInt(evt.target.value, 10) || 4));
		setGenParams((prev) => {
			const last = prev.dayConfigs[prev.dayConfigs.length - 1] || { steps: 40, response_time: 90 };
			const dayConfigs = Array.from({ length: n }, (_, i) => prev.dayConfigs[i] || { ...last });
			return { ...prev, day_count: n, dayConfigs };
		});
	};

	const changeDayConfig = (index, key) => (evt) => {
		const value = Math.max(0, parseInt(evt.target.value, 10) || 0);
		setGenParams((prev) => ({
			...prev,
			dayConfigs: prev.dayConfigs.map((d, i) => (i === index ? { ...d, [key]: value } : d)),
		}));
	};

	const stepBounds = {
		min: genParams.width + genParams.height,
		max: 4 * (genParams.width + genParams.height),
	};
	// fuelLimits must be within [1x, 3x] of Day 1's steps specifically (docs).
	const day1Steps = genParams.dayConfigs[0]?.steps || stepBounds.min;
	const fuelBounds = { min: day1Steps, max: 3 * day1Steps };

	const handleGenerateBoard = () => {
		if (!instance?.match_id) {
			showMessage(tr({ id: "questions.selectMatchFirst" }), "error", 4000);
			return;
		}
		if (!matchTeams?.length) {
			showMessage(tr({ id: "questions.matchHasNoTeams" }), "error", 4000);
			return;
		}
		try {
			const board = generateBoard({
				width: genParams.width,
				height: genParams.height,
				agentsPerTeam: genParams.agents_per_team,
				spotCount: genParams.spot_count,
				brandCount: genParams.brand_count,
				seed: genParams.seed,
			});
			const init = assembleInit({
				board,
				teams: matchTeams,
				daySteps: genParams.dayConfigs.map((d) => d.steps),
				daySeconds: genParams.dayConfigs.map((d) => d.response_time),
				startsAt: Math.floor(Date.now() / 1000) + genParams.starts_in_minutes * 60,
				agentSelectionTimeLimit: genParams.agent_selection_time_limit,
				busyThreshold: genParams.busy_threshold,
				jammedThreshold: genParams.jam_threshold,
				fuelLimits: genParams.fuel,
			});
			handleChange({ type: "hexudon", raw_questions: init });
			showMessage(tr({ id: "questions.boardGenerated" }), "success");
		} catch (e) {
			showMessage(e.message, "error", 6000);
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
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.width" })} type="number" fullWidth size="small"
													value={genParams.width} onChange={changeGenParam("width")}
													helperText="8-32" inputProps={{ min: 8, max: 32 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.height" })} type="number" fullWidth size="small"
													value={genParams.height} onChange={changeGenParam("height")}
													helperText="8-32" inputProps={{ min: 8, max: 32 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.agents" })} type="number" fullWidth size="small"
													value={genParams.agents_per_team} onChange={changeGenParam("agents_per_team")}
													helperText="3-8" inputProps={{ min: 3, max: 8 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.spots" })} type="number" fullWidth size="small"
													value={genParams.spot_count} onChange={changeGenParam("spot_count")}
													helperText={`${genParams.agents_per_team}-${Math.max(genParams.width, genParams.height)}`}
													inputProps={{ min: genParams.agents_per_team, max: Math.max(genParams.width, genParams.height) }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.brands" })} type="number" fullWidth size="small"
													value={genParams.brand_count} onChange={changeGenParam("brand_count")}
													helperText={`1-${genParams.spot_count}`}
													inputProps={{ min: 1, max: genParams.spot_count }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.days" })} type="number" fullWidth size="small"
													value={genParams.day_count} onChange={changeDayCount}
													helperText="4-10" inputProps={{ min: 4, max: 10 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.fuel" })} type="number" fullWidth size="small"
													value={genParams.fuel} onChange={changeGenParam("fuel")}
													helperText={`${fuelBounds.min}-${fuelBounds.max}`}
													inputProps={{ min: fuelBounds.min, max: fuelBounds.max }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.busy" })} type="number" fullWidth size="small"
													value={genParams.busy_threshold} onChange={changeGenParam("busy_threshold")}
													helperText="1-5" inputProps={{ min: 1, max: 5 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.jam" })} type="number" fullWidth size="small"
													value={genParams.jam_threshold} onChange={changeGenParam("jam_threshold")}
													helperText="2-10" inputProps={{ min: 2, max: 10 }} />
											</Grid>
											<Grid size={{ xs: 2 }}>
												<TextField label={tr({ id: "questions.selectionSeconds" })} type="number" fullWidth size="small"
													value={genParams.agent_selection_time_limit}
													onChange={changeGenParam("agent_selection_time_limit")}
													inputProps={{ min: 1 }} />
											</Grid>
											<Grid size={{ xs: 3 }}>
												<TextField label={tr({ id: "questions.startsInMinutes" })} type="number" fullWidth size="small"
													value={genParams.starts_in_minutes} onChange={changeGenParam("starts_in_minutes")}
													inputProps={{ min: 0 }} />
											</Grid>
											<Grid size={{ xs: 3 }}>
												<Stack direction="row" spacing={0.5} alignItems="center">
													<TextField label="Seed" type="number" fullWidth size="small"
														value={genParams.seed} onChange={changeGenParam("seed")} />
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
											<Grid size={{ xs: 6 }} sx={{ display: "flex", alignItems: "center" }}>
												<Button variant="contained" fullWidth onClick={handleGenerateBoard}>
													{tr({ id: "questions.generateBoard" })}
												</Button>
											</Grid>
										</Grid>

										{/* Per-day duration -- days still always run back-to-back (no
										gaps: the docs rule isn't negotiable), but each day's own steps
										and response time are independently settable instead of one
										value copied across every day. */}
										<Box sx={{ overflowX: "auto" }}>
											<Stack direction="row" spacing={1}>
												{genParams.dayConfigs.map((day, index) => (
													<Stack key={index} spacing={0.5} sx={{ minWidth: 110 }}>
														<Typography variant="caption" color="textSecondary" align="center">
															{tr({ id: "questions.dayLabel" })} {index + 1}
														</Typography>
														<TextField
															label={tr({ id: "questions.stepsPerDay" })}
															type="number" size="small"
															value={day.steps}
															onChange={changeDayConfig(index, "steps")}
															helperText={`${stepBounds.min}-${stepBounds.max}`}
															inputProps={{ min: stepBounds.min, max: stepBounds.max }}
														/>
														<TextField
															label={tr({ id: "questions.secondsPerDay" })}
															type="number" size="small"
															value={day.response_time}
															onChange={changeDayConfig(index, "response_time")}
															inputProps={{ min: 1 }}
														/>
													</Stack>
												))}
											</Stack>
										</Box>

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
