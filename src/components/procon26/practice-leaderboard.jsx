import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useIntl } from "react-intl";
import { getPracticeScore, getGameError } from "../../api/gameService";
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
		const merged = {};
		let firstError = null;
		await Promise.all(
			teams.map(async (t) => {
				const tid = String(t.id);
				try {
					const res = await getPracticeScore(`${questionId}:${tid}`);
					merged[tid] = res?.detail?.[tid] || { ...ZERO };
				} catch (e) {
					// A team that hasn't started yet (game missing / still selecting)
					// simply ranks with zeros rather than dropping off the board.
					merged[tid] = { ...ZERO };
					if (!firstError) firstError = getGameError(e);
				}
			}),
		);
		setDetail(merged);
		setError(firstError);
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
			{error && <Alert severity="warning">{error}</Alert>}
			<Standings result={result} ownTeamId={ownTeamId} teamNames={teamNames} />
		</Stack>
	);
};

export default PracticeLeaderboard;
