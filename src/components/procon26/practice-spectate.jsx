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
import RefreshIcon from "@mui/icons-material/Refresh";
import ReplayIcon from "@mui/icons-material/Replay";
import { useIntl } from "react-intl";
import { getGameError, getGameReplay, getGameState } from "../../api/gameService";
import HexBoard from "./hex-board";
import ReplayDialog from "./replay-dialog";
import LoadingPage from "../loading-page";

/**
 * Admin read-only spectator for ONE team's practice game. Practice matches are
 * self-paced, so this is driven by the team's SUBMIT state (which days it has
 * resolved), NOT by a wall-clock timer or background polling: it loads once and
 * refreshes only on demand. Shows per-day submit progress, the latest
 * end-of-day board, and a step-by-step replay (with opponents' final positions).
 */
const PracticeSpectate = ({ questionId, teamId, teamName, mapConfig, opponents }) => {
	const { formatMessage: tr } = useIntl();
	const gameId = `${questionId}:${teamId}`;
	const [state, setState] = useState(null);
	const [replay, setReplay] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [replayOpen, setReplayOpen] = useState(false);

	const totalDays = mapConfig?.daySteps?.length ?? 0;

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const st = await getGameState(gameId);
			setState(st);
			setError(null);
			if (st.status === "in_progress" || st.status === "finished") {
				try {
					setReplay(await getGameReplay(gameId));
				} catch {
					/* replay optional */
				}
			} else {
				setReplay(null);
			}
		} catch (e) {
			setError(getGameError(e));
		} finally {
			setLoading(false);
		}
	}, [gameId]);

	useEffect(() => {
		load();
	}, [load]);

	const team = state?.teams?.[String(teamId)] || {};

	// Which days this team has resolved, and whether each carried a real
	// submission (vs. an all-wait default), read from the replay frames.
	const submittedByDay = useMemo(() => {
		const map = new Map();
		(replay?.days || []).forEach((d) => {
			const t = d.teams?.find((x) => String(x.team_id) === String(teamId)) || d.teams?.[0];
			if (t) map.set(d.day, !!t.submitted);
		});
		return map;
	}, [replay, teamId]);

	// End-of-day board for the latest resolved day (own final positions).
	const latestBoard = useMemo(() => {
		const days = replay?.days || [];
		if (!days.length) return null;
		const d = days[days.length - 1];
		const t = d.teams?.find((x) => String(x.team_id) === String(teamId)) || d.teams?.[0];
		const frame = t?.frames?.[t.frames.length - 1];
		if (!frame) return null;
		return {
			day: d.day,
			roadByCell: d.road_condition || {},
			teams: [
				{
					teamId,
					label: `#${teamId}`,
					color: "#1976d2",
					agents: frame.agents.map((a) => ({
						cell: a.cell,
						kind: a.type === "refuel" ? 1 : 0,
						trail: [],
					})),
				},
			],
		};
	}, [replay, teamId]);

	if (error && !state) return <Alert severity="error">{error}</Alert>;
	if (!state) return <LoadingPage />;

	const playedAny = state.status === "in_progress" || state.status === "finished";

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Chip color="info" variant="outlined" label={tr({ id: "match.practice" })} />
				<Chip
					label={tr({ id: `hexudon.status.${state.status}` })}
					color={state.status === "finished" ? "success" : "primary"}
				/>
				{state.status !== "selecting_agents" && (
					<Chip
						variant="outlined"
						label={`${tr({ id: "hexudon.day" })} ${Math.min(state.day + 1, totalDays)}/${totalDays}`}
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
					startIcon={<RefreshIcon />}
					disabled={loading}
					onClick={load}
				>
					{tr({ id: "practice.spectate.refresh" })}
				</Button>
				{playedAny && (state.status === "finished" || state.day >= 1) && (
					<Button
						size="small"
						variant="outlined"
						startIcon={<ReplayIcon />}
						onClick={() => setReplayOpen(true)}
					>
						{tr({ id: "hexudon.replay.button" })}
					</Button>
				)}
			</Stack>

			{error && <Alert severity="warning">{error}</Alert>}

			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" gutterBottom>
					{tr({ id: "practice.spectate.progress" })}
				</Typography>
				{state.status === "selecting_agents" ? (
					<Alert severity="info">{tr({ id: "practice.spectate.notStarted" })}</Alert>
				) : (
					<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
						{Array.from({ length: totalDays }, (_, d) => {
							const resolved = d < state.day || state.status === "finished";
							const isCurrent = d === state.day && state.status === "in_progress";
							let color = "default";
							let label = `${tr({ id: "hexudon.day" })} ${d + 1}`;
							if (resolved) {
								const didSubmit = submittedByDay.get(d);
								color = didSubmit ? "success" : "warning";
								label += didSubmit ? " ✓" : ` · ${tr({ id: "practice.spectate.waited" })}`;
							} else if (isCurrent) {
								color = "primary";
								label += " …";
							}
							return (
								<Chip
									key={d}
									size="small"
									label={label}
									color={color}
									variant={resolved || isCurrent ? "filled" : "outlined"}
									disabled={!resolved && !isCurrent}
								/>
							);
						})}
					</Stack>
				)}
			</Paper>

			{latestBoard && (
				<Paper variant="outlined" sx={{ p: 1.5 }}>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
						{tr({ id: "practice.spectate.endOfDay" })} {latestBoard.day + 1}
					</Typography>
					<HexBoard
						mapConfig={mapConfig}
						replayTeams={latestBoard.teams}
						roadByCell={latestBoard.roadByCell}
						radius={16}
					/>
				</Paper>
			)}

			<ReplayDialog
				gameId={gameId}
				mapConfig={mapConfig}
				ownTeamId={teamId}
				opponents={opponents}
				questionId={questionId}
				open={replayOpen}
				onClose={() => setReplayOpen(false)}
			/>
		</Stack>
	);
};

export default PracticeSpectate;
