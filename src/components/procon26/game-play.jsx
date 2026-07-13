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
import LoadingPage from "../loading-page";

const POLL_MS = 3000;

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
	return Math.max(0, Math.floor(endsAtEpoch - now));
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
const GamePlay = ({ gameId }) => {
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
	// The actions/replay endpoints are optional (not part of the checked-in
	// FastAPI): probe once and hide the buttons when they don't exist.
	const [historySupported, setHistorySupported] = useState(null);
	const historyProbed = useRef(false);

	// --- static config ------------------------------------------------------
	useEffect(() => {
		let cancelled = false;
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
	}, [gameId]);

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
			const next = await getGameState(gameId);
			setState(next);
			setLoadError(null);
			setDayEndsAt(
				next.day_deadline_in !== null && next.day_deadline_in !== undefined
					? Date.now() / 1000 + next.day_deadline_in
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

	// --- optional history endpoints (mock-only) --------------------------------
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
	const selectionEndsAt = questionConfig
		? questionConfig.startsAt + (questionConfig.agent_selection_time_limit ?? 60)
		: null;
	// day_deadline_in (re-anchored to the client clock each poll) is returned to
	// both roles, so the day countdown uses it regardless of role — immune to
	// client/server clock skew, unlike the absolute /game/day endsAt.
	const countdownTarget =
		state?.status === "selecting_agents" ? selectionEndsAt : dayEndsAt;
	const countdown = useCountdown(state?.status === "finished" ? null : countdownTarget);
	const beforeStart =
		state?.status === "selecting_agents" &&
		questionConfig &&
		Date.now() / 1000 < questionConfig.startsAt;

	const handleKinds = async (types) => {
		setSubmitting(true);
		try {
			await selectAgentTypes(gameId, types);
			showMessage(tr({ id: "hexudon.kinds.saved" }), "success");
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
			{countdown !== null && state.status !== "finished" && (
				<Chip
					variant="outlined"
					color={countdown < 15 ? "error" : "default"}
					sx={{ "& .MuiChip-label": { fontVariantNumeric: "tabular-nums" } }}
					label={`⏱ ${formatCountdown(countdown)}`}
				/>
			)}
			<Box sx={{ flex: 1 }} />
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
						{beforeStart && (
							<Alert severity="info">{tr({ id: "hexudon.waitingStart" })}</Alert>
						)}
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
			/>
		</Stack>
	);
};

export default GamePlay;
