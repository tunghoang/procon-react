import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import TuneIcon from "@mui/icons-material/Tune";
import { useIntl } from "react-intl";
import { jwtDecode } from "jwt-decode";
import Context from "../../context";
import {
	getGameActions,
	getGameConfig,
	getGameDay,
	getGameError,
	getGameResult,
	getGameState,
	isEndpointMissing,
	selectAgentTypes,
	submitActions,
} from "../../api/gameService";
import { api, showMessage } from "../../api/commons";
import { SERVICE_API } from "../../config/env";
import { validatePlan } from "./game-handler";
import HexBoard from "./hex-board";
import AgentKindsPanel from "./agent-kinds-panel";
import PlanEditor from "./plan-editor";
import Standings from "./standings";
import AnswersDialog from "./answers-dialog";
import ReplayDialog from "./replay-dialog";
import GameConfigDialog from "./game-config-dialog";
import LoadingPage from "../loading-page";

const POLL_MS = 3000;

// Epoch seconds -> local clock time (matches the answers dialog's format).
const formatClock = (epochSeconds) =>
	epochSeconds ? new Date(epochSeconds * 1000).toLocaleTimeString() : "—";

const formatCountdown = (totalSeconds) => {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	return hours > 0 ? `${hours}:${mmss}` : mmss;
};

const useCountdown = (endsAtEpoch) => {
	const [now, setNow] = useState(() => Date.now() / 1000);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
		return () => clearInterval(timer);
	}, []);
	if (!endsAtEpoch) return null;
	// CEIL, not floor: with 29.94 s left (the poll's own latency alone eats the
	// first tick) flooring displays "29" for a 30 s window, so a configured
	// window never showed its own number. Ceil counts 30 -> 1 and reaches 0
	// exactly at the deadline.
	return Math.max(0, Math.ceil(endsAtEpoch - now));
};

/**
 * The clock, isolated in its own component on purpose: it re-renders every
 * second, and GamePlay draws the whole SVG board (up to 32x32 = 1024 hexes) plus
 * the plan editor. Keeping the tick's state here means the second hand no longer
 * re-renders the board.
 */
const CountdownChip = ({ endsAt }) => {
	const countdown = useCountdown(endsAt);
	if (countdown === null) return null;
	return (
		<Chip
			variant="outlined"
			color={countdown < 15 ? "error" : "default"}
			sx={{ "& .MuiChip-label": { fontVariantNumeric: "tabular-nums" } }}
			label={`⏱ ${formatCountdown(countdown)}`}
		/>
	);
};

/**
 * The HEXUDON play screen for one game (= one team-manager question).
 *
 * Data sources (matching the real game-service contract):
 *  - static board config: the question's question_data (team-manager) — this
 *    is the /game/init body, available to admins and members alike;
 *  - team-only: GET /game/config (own agents) and GET /game/day (positions,
 *    fuel, traffics, day deadline);
 *  - both roles: GET /game/state — note the real service returns `teams` to
 *    everyone, so the admin/spectator switch comes from the JWT, never from
 *    the response shape.
 */
const GamePlay = ({ gameId, mapConfigOverride = null }) => {
	const { formatMessage: tr } = useIntl();
	const { team: contextTeam } = useContext(Context);

	const decodedTeam = useMemo(() => {
		if (contextTeam) return contextTeam;
		try {
			return jwtDecode(localStorage.getItem("token"));
		} catch {
			return null;
		}
	}, [contextTeam]);
	const isAdmin = !!decodedTeam?.is_admin;
	const ownTeamId = decodedTeam?.id !== undefined ? String(decodedTeam.id) : null;

	const [questionConfig, setQuestionConfig] = useState(null); // parsed question_data
	const [teamConfig, setTeamConfig] = useState(null); // GET /game/config (team only)
	const [state, setState] = useState(null);
	const [dayInfo, setDayInfo] = useState(null); // GET /game/day (team only)
	// Absolute day deadline, re-anchored from state.day_deadline_in each poll so
	// it is immune to client/server clock skew — used for BOTH roles.
	const [dayEndsAt, setDayEndsAt] = useState(null);
	// Same treatment for the agent-selection deadline (state.selection_deadline_in).
	const [selectionDeadlineAt, setSelectionDeadlineAt] = useState(null);
	const [result, setResult] = useState(null);
	const [loadError, setLoadError] = useState(null);
	// Team /game/config load failure — kept separate from loadError (which a
	// successful state poll clears) and retried, so a transient failure can't
	// strand the selection panel on a silent spinner.
	const [configError, setConfigError] = useState(null);
	const [plan, setPlan] = useState([]);
	const [planDay, setPlanDay] = useState(null);
	const [selectedAgent, setSelectedAgent] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [submittedDay, setSubmittedDay] = useState(null);
	const [answersOpen, setAnswersOpen] = useState(false);
	const [replayOpen, setReplayOpen] = useState(false);
	const [configOpen, setConfigOpen] = useState(false);
	// The actions/replay endpoints are optional (not part of the checked-in
	// FastAPI): probe once and hide the buttons when they don't exist.
	const [historySupported, setHistorySupported] = useState(null);
	const historyProbed = useRef(false);

	// --- static config ------------------------------------------------------
	useEffect(() => {
		let cancelled = false;
		// When a board config is supplied (e.g. an admin viewing one team's
		// practice sub-game, whose id isn't a question id), use it directly and
		// skip the /question lookup.
		if (mapConfigOverride) {
			setQuestionConfig(mapConfigOverride);
			return undefined;
		}
		(async () => {
			try {
				// Single-object endpoint: api.get returns the body directly
				// (doGet's extra .data unwrap is for {count, data} lists only).
				const question = await api.get(`${SERVICE_API}/question/${gameId}`);
				if (!cancelled && question?.question_data) {
					setQuestionConfig(JSON.parse(question.question_data));
				}
			} catch (e) {
				if (!cancelled) setLoadError(e.response?.data?.message || e.message);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [gameId, mapConfigOverride]);

	// Team-only /game/config (own agents). Retried while it hasn't loaded (the
	// effect re-runs on each state poll) so a transient failure never strands
	// the selection panel; admins never call it (it 403s for them).
	useEffect(() => {
		if (isAdmin || teamConfig || !gameId) return undefined;
		let cancelled = false;
		getGameConfig(gameId)
			.then((cfg) => {
				if (!cancelled) {
					setTeamConfig(cfg);
					setConfigError(null);
				}
			})
			.catch((e) => {
				if (!cancelled) setConfigError(getGameError(e));
			});
		return () => {
			cancelled = true;
		};
	}, [gameId, isAdmin, teamConfig, state]);

	// --- polling --------------------------------------------------------------
	const refreshState = useCallback(async () => {
		try {
			// Anchor the relative deadlines on the instant the request was SENT,
			// not the instant the reply was parsed. The server measured "x seconds
			// left" somewhere between the two, so anchoring on send can only
			// under-state the remaining time, while anchoring on receive adds the
			// whole round trip and would show a team time the engine will not
			// honour. Under-stating is the safe direction for a submit deadline.
			const requestedAt = Date.now() / 1000;
			const next = await getGameState(gameId);
			setState(next);
			setLoadError(null);
			setDayEndsAt(
				next.day_deadline_in !== null && next.day_deadline_in !== undefined
					? requestedAt + next.day_deadline_in
					: null,
			);
			setSelectionDeadlineAt(
				next.selection_deadline_in !== null &&
					next.selection_deadline_in !== undefined
					? requestedAt + next.selection_deadline_in
					: null,
			);
			if (!isAdmin && next.status !== "finished") {
				try {
					setDayInfo(await getGameDay(gameId));
				} catch {
					// tolerated: e.g. right around game creation/deletion
				}
			}
			if (next.status === "finished" || (isAdmin && next.status === "in_progress")) {
				setResult(await getGameResult(gameId));
			}
		} catch (e) {
			setLoadError(getGameError(e));
		}
	}, [gameId, isAdmin]);

	useEffect(() => {
		refreshState();
		const timer = setInterval(refreshState, POLL_MS);
		return () => clearInterval(timer);
	}, [refreshState]);

	// --- optional history endpoints (feature-detected) -------------------------
	useEffect(() => {
		if (historyProbed.current || !state) return;
		if (!(state.status === "finished" || state.day >= 1)) return;
		historyProbed.current = true;
		getGameActions(gameId)
			.then(() => setHistorySupported(true))
			.catch((e) => setHistorySupported(isEndpointMissing(e) ? false : true));
	}, [state, gameId]);

	const mapConfig = teamConfig || questionConfig;
	const dayInformation = isAdmin ? null : dayInfo;
	const stepsToday = state?.steps_today;
	const totalDays =
		mapConfig?.daySteps?.length ?? questionConfig?.daySteps?.length ?? null;

	// Reset the plan whenever a new day opens: default every agent to an
	// all-day wait (always a valid, submittable baseline).
	useEffect(() => {
		if (!dayInformation || !stepsToday) return;
		if (!dayInformation.agents.length) return;
		if (planDay === state.day) return;
		setPlan(dayInformation.agents.map(() => [-stepsToday]));
		setPlanDay(state.day);
		setSelectedAgent(0);
	}, [dayInformation, stepsToday, planDay, state?.day]);

	const validation = useMemo(() => {
		if (!mapConfig || !dayInformation || !stepsToday) return null;
		if (!dayInformation.agents.length) return null;
		return validatePlan(mapConfig, dayInformation, plan, stepsToday);
	}, [mapConfig, dayInformation, plan, stepsToday]);

	const paths = useMemo(() => {
		if (!validation) return {};
		const result_ = {};
		validation.agents.forEach((agentResult, index) => {
			if (agentResult?.path) result_[index] = agentResult.path;
		});
		return result_;
	}, [validation]);

	// Countdown target: selection window end while selecting; the day
	// deadline while playing (teams read it from /game/day, admins derive it
	// from state.day_deadline_in).
	//
	// The selection deadline comes from the ENGINE (state.selection_deadline_in,
	// re-anchored per poll like dayEndsAt) so it always matches the window the
	// engine actually enforces. Only if the service doesn't send it do we derive
	// it from the config -- and then from a REAL configured limit, never an
	// invented default: the old `?? 60` silently counted 60 s on any game whose
	// stored init body omitted agent_selection_time_limit, regardless of what
	// the match was configured with.
	const configuredSelectionSeconds =
		mapConfig?.agent_selection_time_limit ??
		questionConfig?.agent_selection_time_limit ??
		null;
	const selectionEndsAt =
		selectionDeadlineAt ??
		(questionConfig && configuredSelectionSeconds !== null
			? questionConfig.startsAt + configuredSelectionSeconds
			: null);
	// day_deadline_in (re-anchored to the client clock each poll) is returned to
	// both roles, so the day countdown uses it regardless of role — immune to
	// client/server clock skew, unlike the absolute /game/day endsAt.
	const countdownTarget =
		state?.status === "selecting_agents" ? selectionEndsAt : dayEndsAt;
	// Practice games are self-paced (no wall-clock deadline) -- no countdown.
	const isPractice = !!questionConfig?.is_practice;
	const countdownEndsAt =
		state?.status === "finished" || isPractice ? null : countdownTarget;

	const handleKinds = async (types) => {
		setSubmitting(true);
		try {
			await selectAgentTypes(gameId, types);
			showMessage(tr({ id: "hexudon.kinds.saved" }), "success");
			// Refresh immediately so the board + agent info reflect the just-made
			// selection instead of waiting up to POLL_MS for the next poll.
			await refreshState();
		} catch (e) {
			showMessage(getGameError(e), "error", 4000);
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmitPlan = async (payload) => {
		setSubmitting(true);
		try {
			await submitActions(gameId, state.day, payload);
			setSubmittedDay(state.day);
			showMessage(tr({ id: "hexudon.plan.accepted" }), "success");
			// Pull fresh state right away (agent fuel/positions, day, standings)
			// rather than leaving the UI stale until the next poll tick.
			await refreshState();
		} catch (e) {
			showMessage(getGameError(e), "error", 5000);
		} finally {
			setSubmitting(false);
		}
	};

	if (loadError && !state) {
		return <Alert severity="error">{loadError}</Alert>;
	}
	if (!mapConfig || !state) return <LoadingPage />;

	const showHistoryButtons =
		historySupported === true && (state.status === "finished" || state.day >= 1);

	// Own team's live state (the service returns every team, but submit_count /
	// last_submitted_at are attached only for the caller's own team).
	const ownTeamState = ownTeamId ? state.teams?.[ownTeamId] : null;

	const statusChip = (
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
			<Chip
				label={tr({ id: `hexudon.status.${state.status}` })}
				color={state.status === "in_progress" ? "primary" : state.status === "finished" ? "success" : "default"}
			/>
			{state.status === "in_progress" && totalDays ? (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.day" })} ${state.day + 1}/${totalDays}`}
				/>
			) : null}
			{stepsToday ? (
				<Chip variant="outlined" label={`${tr({ id: "hexudon.steps" })}: ${stepsToday}`} />
			) : null}
			{/* Own team's submission cadence for the current day: how many times
			    it has (re)submitted and when it last did. */}
			{!isAdmin && state.status === "in_progress" && ownTeamId && ownTeamState ? (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.submit.count" })}: ${ownTeamState.submit_count ?? 0}${
						ownTeamState.last_submitted_at
							? ` · ${tr({ id: "hexudon.submit.last" })}: ${formatClock(ownTeamState.last_submitted_at)}`
							: ""
					}`}
				/>
			) : null}
			{state.status !== "finished" && <CountdownChip endsAt={countdownEndsAt} />}
			<Box sx={{ flex: 1 }} />
			<Button
				size="small"
				variant="outlined"
				startIcon={<TuneIcon />}
				onClick={() => setConfigOpen(true)}
			>
				{tr({ id: "hexudon.config.button" })}
			</Button>
			{showHistoryButtons && (
				<Button
					size="small"
					variant="outlined"
					startIcon={<ReplayIcon />}
					onClick={() => setReplayOpen(true)}
				>
					{tr({ id: "hexudon.replay.button" })}
				</Button>
			)}
			{showHistoryButtons && (
				<Button
					size="small"
					variant="outlined"
					startIcon={<FactCheckOutlinedIcon />}
					onClick={() => setAnswersOpen(true)}
				>
					{tr({ id: "hexudon.answers.button" })}
				</Button>
			)}
		</Stack>
	);

	return (
		<Stack spacing={2}>
			{statusChip}
			{loadError && <Alert severity="warning">{loadError}</Alert>}
			{configError && <Alert severity="warning">{configError}</Alert>}

			{/* Phase panel on top, the (zoomable) board below it, full width. */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				{state.status === "selecting_agents" && !isAdmin && (
					<Stack spacing={2}>
						{/* Selection is open for the whole lead-in; the countdown
						    above ticks down to Day 1. */}
						{teamConfig ? (
							<AgentKindsPanel
								mapConfig={teamConfig}
								onSubmit={handleKinds}
								submitting={submitting}
							/>
						) : (
							<LoadingPage />
						)}
					</Stack>
				)}

				{state.status === "in_progress" && !isAdmin && dayInformation && (
					dayInformation.agents.length ? (
						<PlanEditor
							mapConfig={mapConfig}
							dayInformation={dayInformation}
							requiredSteps={stepsToday}
							plan={plan}
							onPlanChange={setPlan}
							selectedAgent={selectedAgent}
							onSelectAgent={setSelectedAgent}
							onSubmit={handleSubmitPlan}
							submitting={submitting}
							submitted={submittedDay === state.day}
						/>
					) : (
						<Alert severity="info">{tr({ id: "hexudon.waitingStart" })}</Alert>
					)
				)}

				{isAdmin && state.status !== "finished" && (
					<Stack spacing={1}>
						<Typography variant="subtitle1">
							{tr({ id: "hexudon.admin.spectator" })}
						</Typography>
						{Object.entries(state.teams || {}).map(([teamId, teamState]) => (
							<Box key={teamId}>
								<Typography variant="body2">
									<b>{tr({ id: "hexudon.standings.team" })} {teamId}</b>
									{" — "}
									{tr({ id: "hexudon.standings.distinct" })}:{" "}
									{(teamState.distinct_types || []).length},{" "}
									{tr({ id: "hexudon.standings.servings" })}: {teamState.total_servings}
									{state.status === "in_progress" &&
										` — ${tr({ id: "hexudon.submit.count" })}: ${teamState.submit_count ?? 0}${
											teamState.last_submitted_at
												? ` (${tr({ id: "hexudon.submit.last" })}: ${formatClock(teamState.last_submitted_at)})`
												: ""
										}`}
									{state.status === "selecting_agents" &&
										` — ${tr({ id: teamState.types_selected ? "hexudon.kinds.selected" : "hexudon.kinds.waiting" })}`}
								</Typography>
							</Box>
						))}
						{state.status === "in_progress" && result && (
							<>
								<Typography variant="subtitle2" sx={{ pt: 1 }}>
									{tr({ id: "hexudon.standings.live" })}
								</Typography>
								<Standings result={result} ownTeamId={null} />
							</>
						)}
					</Stack>
				)}

				{state.status === "finished" && (
					<Standings result={result} ownTeamId={ownTeamId} />
				)}
			</Paper>

			<Paper variant="outlined" sx={{ p: 1.5 }}>
				<HexBoard
					mapConfig={mapConfig}
					dayInformation={dayInformation}
					adminTeams={isAdmin ? state.teams : null}
					roadByCell={isAdmin ? state.road_condition : null}
					paths={state.status === "in_progress" && !isAdmin ? paths : {}}
					selectedAgent={selectedAgent}
					radius={16}
				/>
			</Paper>

			<AnswersDialog
				gameId={gameId}
				open={answersOpen}
				onClose={() => setAnswersOpen(false)}
				ownTeamId={ownTeamId}
			/>
			<ReplayDialog
				gameId={gameId}
				mapConfig={mapConfig}
				open={replayOpen}
				onClose={() => setReplayOpen(false)}
				ownTeamId={ownTeamId}
				// Real (competitive) match: a competing team must never see any
				// opponent's trace. Admins/spectators keep the full multi-team view.
				ownTeamOnly={!isPractice && !isAdmin}
			/>
			<GameConfigDialog gameId={gameId} open={configOpen} onClose={() => setConfigOpen(false)} />
		</Stack>
	);
};

export default GamePlay;
