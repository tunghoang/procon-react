import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ReplayIcon from "@mui/icons-material/Replay";
import TuneIcon from "@mui/icons-material/Tune";
import { useIntl } from "react-intl";
import {
	getGameConfig,
	getGameDay,
	getGameError,
	getGameReplay,
	getGameState,
	resetPractice,
	selectAgentTypes,
	submitPracticeActions,
} from "../../api/gameService";
import { showMessage } from "../../api/commons";
import HexBoard from "./hex-board";
import PlanEditor from "./plan-editor";
import AgentKindsPanel from "./agent-kinds-panel";
import ReplayDialog from "./replay-dialog";
import GameConfigDialog from "./game-config-dialog";
import PracticeLeaderboard from "./practice-leaderboard";
import LoadingPage from "../loading-page";

/**
 * Self-paced practice play for ONE team. Each team plays its own isolated
 * solo game at id `${questionId}:${ownTeamId}` (created by the team manager
 * for a practice match). No countdown: the team submits a day to advance it.
 *
 * Two flavours (see the match mode):
 *  - Plain practice: the team may re-submit an earlier day (which resets the
 *    later ones), reset the whole game, and compare with / copy another team.
 *  - Competitive practice (`noReset`): a submitted day is FINAL -- no re-submit,
 *    no reset, no opponent compare/copy; instead a shared leaderboard is shown.
 *    The team is warned before each (irreversible) submission.
 */
const PracticePlay = ({ questionId, ownTeamId, mapConfig, matchTeams, noReset = false }) => {
	const { formatMessage: tr } = useIntl();
	const practiceGameId = `${questionId}:${ownTeamId}`;

	const [teamConfig, setTeamConfig] = useState(null);
	const [state, setState] = useState(null);
	const [dayInfo, setDayInfo] = useState(null); // current-day info (/game/day)
	const [replay, setReplay] = useState(null); // resolved days (for past-day edit + compare)
	const [submitDay, setSubmitDay] = useState(null); // which day is being edited
	const [plan, setPlan] = useState([]);
	const [selectedAgent, setSelectedAgent] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [replayOpen, setReplayOpen] = useState(false);
	const [configOpen, setConfigOpen] = useState(false);

	// Practice games are open-ended (no day limit): the days that exist are
	// 0..state.day -- state.day is the current, submittable day and 0..state.day-1
	// are resolved. There is no fixed total, so day counts derive from state.day.
	const refresh = useCallback(async () => {
		try {
			const [st, cfg] = await Promise.all([
				getGameState(practiceGameId),
				teamConfig ? Promise.resolve(teamConfig) : getGameConfig(practiceGameId),
			]);
			setState(st);
			if (!teamConfig) setTeamConfig(cfg);
			setError(null);
			if (st.status === "in_progress") {
				try {
					setDayInfo(await getGameDay(practiceGameId));
				} catch {
					/* tolerated */
				}
			}
			// Resolved-day frames power past-day editing + the compare dialog.
			if (st.status === "in_progress" || st.status === "finished") {
				try {
					setReplay(await getGameReplay(practiceGameId));
				} catch {
					/* replay optional */
				}
			}
		} catch (e) {
			setError(getGameError(e));
		}
	}, [practiceGameId, teamConfig]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// Default the edited day to the current (next unplayed) day whenever the game
	// advances. Practice is open-ended so this is simply state.day.
	useEffect(() => {
		if (state?.status === "in_progress" || state?.status === "finished") {
			setSubmitDay(state.day);
		}
	}, [state?.status, state?.day]);

	// The day-info the editor validates against: the live /game/day for the
	// current day, or the start-of-day frame from replay for a past day.
	const editing = useMemo(() => {
		if (submitDay == null || !state) return null;
		if (submitDay === state.day) {
			return dayInfo ? { info: dayInfo, steps: state.steps_today } : null;
		}
		// past day -> rebuild start-of-day info from the replay's day frames
		const d = replay?.days?.find((x) => x.day === submitDay);
		if (!d) return null;
		const teamDay = d.teams.find((t) => String(t.team_id) === String(ownTeamId));
		if (!teamDay || !teamDay.frames?.length) return null;
		const frame0 = teamDay.frames[0];
		return {
			info: {
				day: submitDay,
				endsAt: null,
				agents: frame0.agents.map((a) => ({
					kind: a.type === "refuel" ? 1 : 0,
					pos: a.cell,
					fuel: a.fuel,
				})),
				others: [],
				traffics: Object.entries(d.road_condition || {}).map(([pos, status]) => ({
					pos: Number(pos),
					status,
				})),
			},
			steps: d.steps,
		};
	}, [submitDay, state, dayInfo, replay, ownTeamId]);

	// Reset the plan to an all-day wait whenever the edited day / its info changes.
	useEffect(() => {
		if (!editing?.info?.agents?.length) return;
		setPlan(editing.info.agents.map(() => [-editing.steps]));
		setSelectedAgent(0);
	}, [submitDay, editing?.steps, editing?.info?.agents?.length]);

	const handleKinds = async (types) => {
		setSubmitting(true);
		try {
			await selectAgentTypes(practiceGameId, types);
			showMessage(tr({ id: "hexudon.kinds.saved" }), "success");
			await refresh();
		} catch (e) {
			showMessage(getGameError(e), "error", 4000);
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = async (payload) => {
		// Competitive practice: a submission is FINAL (no reset / no re-submit),
		// so warn before it goes through.
		if (noReset && !window.confirm(tr({ id: "practice.submitFinalConfirm" }))) {
			return;
		}
		setSubmitting(true);
		try {
			await submitPracticeActions(practiceGameId, submitDay, payload);
			showMessage(tr({ id: "hexudon.plan.accepted" }), "success");
			await refresh();
		} catch (e) {
			showMessage(getGameError(e), "error", 5000);
		} finally {
			setSubmitting(false);
		}
	};

	const handleReset = async () => {
		if (!window.confirm(tr({ id: "practice.resetConfirm" }))) return;
		setSubmitting(true);
		try {
			await resetPractice(practiceGameId);
			showMessage(tr({ id: "practice.resetDone" }), "success");
			await refresh();
		} catch (e) {
			showMessage(getGameError(e), "error", 5000);
		} finally {
			setSubmitting(false);
		}
	};

	if (error && !state) return <Alert severity="error">{error}</Alert>;
	if (!mapConfig || !state) return <LoadingPage />;

	const team = state.teams?.[String(ownTeamId)] || {};
	const otherTeams = (matchTeams || []).filter((t) => String(t.id) !== String(ownTeamId));

	const statusChips = (
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
			<Chip
				color={noReset ? "warning" : "info"}
				variant="outlined"
				label={tr({ id: noReset ? "match.mode.competitivePractice" : "match.practice" })}
			/>
			<Chip
				label={tr({ id: `hexudon.status.${state.status}` })}
				color={state.status === "finished" ? "success" : "primary"}
			/>
			{state.status !== "selecting_agents" && (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.day" })} ${state.day + 1}`}
				/>
			)}
			<Chip
				variant="outlined"
				label={`${tr({ id: "hexudon.standings.distinct" })}: ${(team.distinct_types || []).length}`}
			/>
			<Chip
				variant="outlined"
				label={`${tr({ id: "hexudon.standings.servings" })}: ${team.total_servings ?? 0}`}
			/>
			<Box sx={{ flex: 1 }} />
			<Button
				size="small"
				variant="outlined"
				startIcon={<TuneIcon />}
				onClick={() => setConfigOpen(true)}
			>
				{tr({ id: "hexudon.config.button" })}
			</Button>
			{(state.status === "finished" || state.day >= 1) && (
				<Button
					size="small"
					variant="outlined"
					startIcon={<ReplayIcon />}
					onClick={() => setReplayOpen(true)}
				>
					{tr({ id: "hexudon.replay.button" })}
				</Button>
			)}
			{!noReset && state.status !== "selecting_agents" && (
				<Button
					size="small"
					color="warning"
					variant="outlined"
					startIcon={<RestartAltIcon />}
					disabled={submitting}
					onClick={handleReset}
				>
					{tr({ id: "practice.resetButton" })}
				</Button>
			)}
		</Stack>
	);

	const playing = state.status === "in_progress" || state.status === "finished";

	// Day strip: pick which day to (re)submit. Practice is open-ended (no day
	// limit), so the days that exist are 0..state.day. In plain practice every
	// one is editable (submitting a past day resets the later ones); in
	// competitive practice only the CURRENT day (state.day) is submittable --
	// past days are final, shown as read-only history. Current day highlighted.
	const dayStrip = playing ? (
		<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
			<Typography variant="body2" color="textSecondary">
				{tr({ id: noReset ? "practice.currentDay" : "practice.editDay" })}:
			</Typography>
			{Array.from({ length: state.day + 1 }, (_, d) => {
				const editable = noReset ? d === state.day : d <= state.day;
				return (
					<Chip
						key={d}
						size="small"
						label={`${tr({ id: "hexudon.day" })} ${d + 1}`}
						color={d === submitDay ? "primary" : d === state.day ? "success" : "default"}
						variant={d === submitDay ? "filled" : "outlined"}
						disabled={!editable}
						onClick={editable ? () => setSubmitDay(d) : undefined}
					/>
				);
			})}
		</Stack>
	) : null;

	return (
		<Stack spacing={2}>
			{statusChips}
			{error && <Alert severity="warning">{error}</Alert>}

			<Paper variant="outlined" sx={{ p: 2 }}>
				{state.status === "selecting_agents" &&
					(teamConfig ? (
						<AgentKindsPanel
							mapConfig={teamConfig}
							onSubmit={handleKinds}
							submitting={submitting}
						/>
					) : (
						<LoadingPage />
					))}

				{playing && (
					<Stack spacing={1.5}>
						{state.status === "finished" && (
							<Alert severity="success">{tr({ id: "practice.finished" })}</Alert>
						)}
						{dayStrip}
						{submitDay != null && submitDay < state.day && (
							<Alert severity="warning">
								{tr({ id: "practice.resubmitWarn" })}
							</Alert>
						)}
						{editing?.info?.agents?.length ? (
							<PlanEditor
								mapConfig={mapConfig}
								dayInformation={editing.info}
								requiredSteps={editing.steps}
								plan={plan}
								onPlanChange={setPlan}
								selectedAgent={selectedAgent}
								onSelectAgent={setSelectedAgent}
								onSubmit={handleSubmit}
								submitting={submitting}
								submitted={false}
								showAgentSelector={false}
							/>
						) : (
							<LoadingPage />
						)}
					</Stack>
				)}
			</Paper>

			<Paper variant="outlined" sx={{ p: 1.5 }}>
				<HexBoard
					mapConfig={mapConfig}
					dayInformation={editing?.info || dayInfo}
					radius={16}
				/>
			</Paper>

			{/* Competitive practice: a shared leaderboard across all teams'
			    solo games (ranking + scores only, never opponents' moves). */}
			{noReset && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<PracticeLeaderboard
						questionId={questionId}
						teams={matchTeams || []}
						ownTeamId={ownTeamId}
					/>
				</Paper>
			)}

			<ReplayDialog
				gameId={practiceGameId}
				mapConfig={mapConfig}
				ownTeamId={ownTeamId}
				// Competitive practice hides opponents entirely (no peer compare);
				// plain practice lets a team overlay others' end-of-day positions.
				opponents={noReset ? [] : otherTeams.map((t) => ({ id: t.id, name: t.name }))}
				questionId={questionId}
				open={replayOpen}
				onClose={() => setReplayOpen(false)}
			/>
			<GameConfigDialog
				gameId={practiceGameId}
				open={configOpen}
				onClose={() => setConfigOpen(false)}
			/>
		</Stack>
	);
};

export default PracticePlay;
