import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useIntl } from "react-intl";
import {
	getCompetitiveState,
	getGameConfig,
	getGameError,
	selectAgentTypes,
	submitCompetitiveActions,
} from "../../api/gameService";
import { showMessage } from "../../api/commons";
import HexBoard from "./hex-board";
import PlanEditor from "./plan-editor";
import AgentKindsPanel from "./agent-kinds-panel";
import LoadingPage from "../loading-page";

/**
 * Competitive-practice play: ONE shared timeline for the whole match (game id =
 * bare question id). Every day has a single "standing" answer owned by a team.
 * A team may submit the OPEN day (which advances the timeline) or OVERRIDE the
 * last resolved day -- the override is accepted only if it scores strictly
 * higher than the current holder (enforced server-side). Agent types are locked
 * match-wide by whoever selects first. Teams rank by number of days owned.
 *
 * `ownTeamId` null => admin/spectator (read-only: board + standings, no submit).
 */
const CompetitivePracticePlay = ({ questionId, ownTeamId, mapConfig, matchTeams }) => {
	const { formatMessage: tr } = useIntl();
	const isAdmin = !ownTeamId;

	const [cstate, setCstate] = useState(null);
	const [teamConfig, setTeamConfig] = useState(null);
	const [target, setTarget] = useState("open"); // "open" | "prev"
	const [plan, setPlan] = useState([]);
	const [selectedAgent, setSelectedAgent] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	const teamNames = useMemo(() => {
		const m = {};
		(matchTeams || []).forEach((t) => {
			m[String(t.id)] = t.name;
		});
		return m;
	}, [matchTeams]);

	const refresh = useCallback(async () => {
		try {
			const [cs, cfg] = await Promise.all([
				getCompetitiveState(questionId),
				!isAdmin && !teamConfig
					? getGameConfig(questionId)
					: Promise.resolve(teamConfig),
			]);
			setCstate(cs);
			if (!isAdmin && !teamConfig && cfg) setTeamConfig(cfg);
			setError(null);
		} catch (e) {
			setError(getGameError(e));
		}
	}, [questionId, isAdmin, teamConfig]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// A "prev" (overridable) day only exists once at least one day is resolved.
	const canOverride = !!cstate?.prev;
	const board = target === "prev" && canOverride ? cstate?.prev : cstate?.open;

	// If the override target vanished (e.g. state reset), fall back to the open day.
	useEffect(() => {
		if (target === "prev" && !canOverride) setTarget("open");
	}, [target, canOverride]);

	// Build the PlanEditor/HexBoard dayInformation from the selected board, and
	// reset the plan to an all-day wait whenever the target board changes.
	const dayInformation = useMemo(() => {
		if (!board) return null;
		return {
			day: board.day,
			endsAt: null,
			agents: board.agents.map((a) => ({ kind: a.kind, pos: a.pos, fuel: a.fuel })),
			others: [],
			traffics: Object.entries(board.road_condition || {}).map(([pos, status]) => ({
				pos: Number(pos),
				status,
			})),
		};
	}, [board]);

	useEffect(() => {
		if (!board?.agents?.length) return;
		setPlan(board.agents.map(() => [-board.steps]));
		setSelectedAgent(0);
	}, [target, board?.day, board?.steps, board?.agents?.length]);

	const handleKinds = async (types) => {
		setSubmitting(true);
		try {
			await selectAgentTypes(questionId, types);
			showMessage(tr({ id: "hexudon.kinds.saved" }), "success");
			await refresh();
		} catch (e) {
			showMessage(getGameError(e), "error", 4000);
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = async (payload) => {
		if (!board) return;
		const isOverride = target === "prev";
		const msg = isOverride
			? tr({ id: "competitive.overrideConfirm" })
			: tr({ id: "competitive.submitConfirm" });
		if (!window.confirm(msg)) return;
		setSubmitting(true);
		try {
			const res = await submitCompetitiveActions(questionId, board.day, payload);
			showMessage(
				tr(
					{ id: res.action === "override" ? "competitive.overrideOk" : "competitive.submitOk" },
				),
				"success",
			);
			setTarget("open");
			await refresh();
		} catch (e) {
			showMessage(getGameError(e), "error", 6000);
		} finally {
			setSubmitting(false);
		}
	};

	if (error && !cstate) return <Alert severity="error">{error}</Alert>;
	if (!mapConfig || !cstate) return <LoadingPage />;

	const st = cstate.standings || {};
	const owned = st.owned_days || {};
	const ranking = st.ranking || [];

	const header = (
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
			<Chip color="warning" variant="outlined" label={tr({ id: "match.mode.competitivePractice" })} />
			{cstate.selecting ? (
				<Chip label={tr({ id: "hexudon.status.selecting_agents" })} color="default" />
			) : (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.day" })} ${cstate.open_day + 1}`}
				/>
			)}
			{!cstate.selecting && (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.standings.distinct" })}: ${st.timeline?.distinct_types ?? 0}`}
				/>
			)}
			{!cstate.selecting && (
				<Chip
					variant="outlined"
					label={`${tr({ id: "hexudon.standings.servings" })}: ${st.timeline?.total_servings ?? 0}`}
				/>
			)}
			<Box sx={{ flex: 1 }} />
			<Button size="small" variant="outlined" startIcon={<RefreshIcon />} disabled={submitting} onClick={refresh}>
				{tr({ id: "practice.spectate.refresh" })}
			</Button>
		</Stack>
	);

	const leaderboard = (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle2" gutterBottom>
				{tr({ id: "competitive.daysOwned" })}
			</Typography>
			<TableContainer sx={{ maxHeight: 360 }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>#</TableCell>
							<TableCell>{tr({ id: "hexudon.standings.team" })}</TableCell>
							<TableCell align="right">{tr({ id: "competitive.daysOwned" })}</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{ranking.map((tid, i) => {
							const own = String(tid) === String(ownTeamId);
							return (
								<TableRow key={tid} selected={own}>
									<TableCell>{i + 1}</TableCell>
									<TableCell sx={{ fontWeight: own ? "bold" : "normal" }}>
										{teamNames[tid] || tid}
										{own ? ` (${tr({ id: "hexudon.standings.you" })})` : ""}
									</TableCell>
									<TableCell align="right">{owned[tid] ?? 0}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
		</Paper>
	);

	return (
		<Stack spacing={2}>
			{header}
			{error && <Alert severity="warning">{error}</Alert>}

			{/* Agent selection: the first team to pick locks types for the match. */}
			{cstate.selecting && !isAdmin && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Alert severity="info" sx={{ mb: 2 }}>
						{tr({ id: "competitive.typesLockHint" })}
					</Alert>
					{teamConfig ? (
						<AgentKindsPanel mapConfig={teamConfig} onSubmit={handleKinds} submitting={submitting} />
					) : (
						<LoadingPage />
					)}
				</Paper>
			)}
			{cstate.selecting && isAdmin && (
				<Alert severity="info">{tr({ id: "competitive.waitingTypes" })}</Alert>
			)}

			{/* Play: day selector (open vs override prev) + plan editor. */}
			{!cstate.selecting && !isAdmin && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack spacing={1.5}>
						<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
							<Typography variant="body2" color="textSecondary">
								{tr({ id: "competitive.submitFor" })}:
							</Typography>
							<Chip
								label={`${tr({ id: "competitive.openDay" })} (${tr({ id: "hexudon.day" })} ${cstate.open_day + 1})`}
								color={target === "open" ? "primary" : "default"}
								variant={target === "open" ? "filled" : "outlined"}
								onClick={() => setTarget("open")}
							/>
							{canOverride && (
								<Chip
									label={`${tr({ id: "competitive.overrideDay" })} (${tr({ id: "hexudon.day" })} ${cstate.prev.day + 1})`}
									color={target === "prev" ? "warning" : "default"}
									variant={target === "prev" ? "filled" : "outlined"}
									onClick={() => setTarget("prev")}
								/>
							)}
						</Stack>
						{target === "prev" && canOverride && (
							<Alert severity="warning">
								{tr(
									{ id: "competitive.overrideInfo" },
									{
										owner: teamNames[cstate.prev.owner] || cstate.prev.owner,
										score: (cstate.prev.holder_score || []).join(" / "),
									},
								)}
							</Alert>
						)}
						{dayInformation?.agents?.length ? (
							<PlanEditor
								mapConfig={mapConfig}
								dayInformation={dayInformation}
								requiredSteps={board.steps}
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
				</Paper>
			)}

			{/* Shared board (read-only view for admin; live board for teams). */}
			<Paper variant="outlined" sx={{ p: 1.5 }}>
				<HexBoard mapConfig={mapConfig} dayInformation={dayInformation} radius={16} />
			</Paper>

			{leaderboard}
		</Stack>
	);
};

export default CompetitivePracticePlay;
