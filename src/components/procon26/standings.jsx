import { useMemo, useState } from "react";
import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
	Typography,
} from "@mui/material";
import { useIntl } from "react-intl";

/**
 * Ranking table from GET /game/result. The official tie-break order:
 * distinct udon types, cumulative daily distinct types, total servings,
 * lowest cumulative response time.
 *
 * Every column is click-to-sort (same interaction as the round-standings page),
 * and the body scrolls under a sticky header at `maxHeight` so a 24-team match
 * cannot stretch the panel down the page. Sorting is a VIEW: the "#" column
 * always shows the engine's own position, so re-sorting by servings can never
 * be mistaken for a different ranking.
 */
const Standings = ({ result, ownTeamId, teamNames = {}, maxHeight = 420 }) => {
	const { formatMessage: tr } = useIntl();
	// key null = the engine's ranking order, exactly as it arrives.
	const [sort, setSort] = useState({ key: null, dir: "asc" });

	const ranking = result?.ranking;

	// Hooks must run before the empty-result return below, so build the rows
	// unconditionally and keep each team's official position on the row.
	const rows = useMemo(
		() =>
			(ranking ?? []).map((teamId, index) => {
				const detail = result?.detail?.[teamId] || {};
				return {
					teamId,
					rank: index + 1,
					// Field names match the sort keys in headCell (the comparator reads
					// row[sort.key], so a mismatch silently sorts by nothing).
					// `||`, not `??`: an empty name still falls back to the id.
					team: teamNames[teamId] || teamId,
					distinct: detail.distinct_types,
					daily: detail.cumulative_daily_types,
					servings: detail.total_servings,
					response: detail.cumulative_response_time,
				};
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ranking, result?.detail, teamNames],
	);

	const sortedRows = useMemo(() => {
		if (!sort.key) return rows;
		const dir = sort.dir === "desc" ? -1 : 1;
		return [...rows].sort((a, b) => {
			const av = a[sort.key];
			const bv = b[sort.key];
			// A team whose detail is missing that metric sits at the bottom either
			// way, instead of sorting as if it scored zero.
			const aMissing = av === null || av === undefined;
			const bMissing = bv === null || bv === undefined;
			if (aMissing !== bMissing) return aMissing ? 1 : -1;
			if (aMissing && bMissing) return 0;
			// Team ids are numeric in practice ("6" before "24"), but a named team
			// (the practice leaderboard passes teamNames) must sort as text.
			const an = Number(av);
			const bn = Number(bv);
			if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
			return String(av).localeCompare(String(bv)) * dir;
		});
	}, [rows, sort]);

	if (!ranking?.length) {
		return <Typography color="textSecondary">{tr({ id: "hexudon.standings.empty" })}</Typography>;
	}

	// A first click on a score column shows the BEST first (highest count, or the
	// fastest response time); position and team read naturally ascending.
	const firstDir = (key) =>
		key === "distinct" || key === "daily" || key === "servings" ? "desc" : "asc";

	const toggleSort = (key) =>
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: firstDir(key) },
		);

	const headCell = (key, label, align = "right") => (
		<TableCell align={align} sortDirection={sort.key === key ? sort.dir : false}>
			<TableSortLabel
				active={sort.key === key}
				direction={sort.key === key ? sort.dir : firstDir(key)}
				onClick={() => toggleSort(key)}
			>
				{label}
			</TableSortLabel>
		</TableCell>
	);

	return (
		<TableContainer component={Paper} variant="outlined" sx={{ maxHeight }}>
			<Table size="small" stickyHeader>
				<TableHead>
					<TableRow>
						{headCell("rank", "#", "left")}
						{headCell("team", tr({ id: "hexudon.standings.team" }), "left")}
						{headCell("distinct", tr({ id: "hexudon.standings.distinct" }))}
						{headCell("daily", tr({ id: "hexudon.standings.daily" }))}
						{headCell("servings", tr({ id: "hexudon.standings.servings" }))}
						{headCell("response", tr({ id: "hexudon.standings.response" }))}
					</TableRow>
				</TableHead>
				<TableBody>
					{sortedRows.map((row) => {
						const own = String(row.teamId) === String(ownTeamId);
						return (
							<TableRow key={row.teamId} selected={own}>
								<TableCell>{row.rank}</TableCell>
								<TableCell sx={{ fontWeight: own ? "bold" : "normal" }}>
									{row.team}
									{own ? ` (${tr({ id: "hexudon.standings.you" })})` : ""}
								</TableCell>
								<TableCell align="right">{row.distinct}</TableCell>
								<TableCell align="right">{row.daily}</TableCell>
								<TableCell align="right">{row.servings}</TableCell>
								<TableCell align="right">{row.response}s</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

export default Standings;
