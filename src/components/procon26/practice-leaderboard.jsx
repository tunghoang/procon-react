import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useIntl } from "react-intl";
import { getPracticeScore, getGameError } from "../../api/gameService";
import { runPool, withRetryOn429 } from "../../utils/pool";
import Standings from "./standings";

const ZERO = {
	distinct_types: 0,
	cumulative_daily_types: 0,
	total_servings: 0,
	cumulative_response_time: 0,
};

/**
 * Shared leaderboard for a COMPETITIVE PRACTICE match. Each team plays its own
 * self-paced solo game `${questionId}:${teamId}`, so there is no single shared
 * /game/result -- we fetch each team's result and merge them into one ranking
 * (reusing the normal <Standings> table). Only the ranking + aggregate scores
 * are shown; a team's step-by-step play stays private (no opponent replay).
 *
 * Ranking follows the official tie-break order: distinct udon types, cumulative
 * daily distinct types, total servings, then lowest response time (always 0 in
 * self-paced practice, so effectively unused).
 */
const PracticeLeaderboard = ({ questionId, teams = [], ownTeamId = null }) => {
	const { formatMessage: tr } = useIntl();
	const [detail, setDetail] = useState({});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	// Set while a request is waiting out a 429's Retry-After, so the board says
	// "rate limited, retrying" instead of quietly showing someone a zero.
	const [throttled, setThrottled] = useState(false);

	const teamNames = useMemo(() => {
		const m = {};
		teams.forEach((t) => {
			m[String(t.id)] = t.name;
		});
		return m;
	}, [teams]);

	const load = useCallback(async () => {
		if (!teams.length) return;
		setLoading(true);
		setThrottled(false);
		const merged = {};
		let firstError = null;
		// One request per team, but at most 3 in flight: the engine's read
		// budget is 5/s (burst 10) per token, so a `Promise.all` over a 12-team
		// roster came back part-429 and every throttled team showed as zeros --
		// i.e. a WRONG leaderboard, not just a slow one.
		await runPool(teams, async (t) => {
			const tid = String(t.id);
			try {
				const res = await withRetryOn429(
					() => getPracticeScore(`${questionId}:${tid}`),
					{ onRateLimited: () => setThrottled(true) },
				);
				merged[tid] = res?.detail?.[tid] || { ...ZERO };
			} catch (e) {
				// A team that hasn't started yet (game missing / still selecting)
				// simply ranks with zeros rather than dropping off the board.
				merged[tid] = { ...ZERO };
				if (!firstError) firstError = getGameError(e);
			}
		});
		setDetail(merged);
		setError(firstError);
		setThrottled(false);
		setLoading(false);
	}, [questionId, teams]);

	useEffect(() => {
		load();
	}, [load]);

	const result = useMemo(() => {
		const ranking = Object.keys(detail).sort((a, b) => {
			const da = detail[a] || ZERO;
			const db = detail[b] || ZERO;
			return (
				(db.distinct_types || 0) - (da.distinct_types || 0) ||
				(db.cumulative_daily_types || 0) - (da.cumulative_daily_types || 0) ||
				(db.total_servings || 0) - (da.total_servings || 0) ||
				(da.cumulative_response_time || 0) - (db.cumulative_response_time || 0)
			);
		});
		return { ranking, detail };
	}, [detail]);

	return (
		<Stack spacing={1}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography variant="subtitle2">
					{tr({ id: "hexudon.standings.live" })}
				</Typography>
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
			</Stack>
			{throttled && (
				<Alert severity="info">{tr({ id: "hexudon.rateLimited" })}</Alert>
			)}
			{error && <Alert severity="warning">{error}</Alert>}
			<Standings result={result} ownTeamId={ownTeamId} teamNames={teamNames} />
		</Stack>
	);
};

export default PracticeLeaderboard;
