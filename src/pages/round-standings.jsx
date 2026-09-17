import * as mui from "@mui/material";
import { useIntl } from "react-intl";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import PauseIcon from "@mui/icons-material/Pause";
import PlayIcon from "@mui/icons-material/PlayArrow";
import { api } from "../api/commons";
import { SERVICE_API } from "../config/env";
import PageToolbar from "../components/page-toolbar";
import Context from "../context";
import { debugError } from "../utils/debug";

/**
 * HEXUDON round standings (ADMIN ONLY -- the endpoints behind it are mounted
 * under requireAdmin).
 *
 * Scoring: every match is ranked by the engine, a team's score there is its
 * FINISHING POSITION (1st = 1), and the round total is the sum of those
 * positions -- so the SMALLEST total wins. A rostered team that never competed
 * (no agent kinds chosen) takes that match's LAST position, shown as "N · DNP";
 * a match a team was not rostered for does not count for it at all.
 *
 * This is separate from the legacy /answer/summary page: HEXUDON teams submit
 * straight to the game service, so the manager's `answer` table is empty for
 * these matches and only /game/result has the scores.
 *
 * The table auto-refreshes while the tab is visible; the toggle in the toolbar
 * turns it off (useful once the standings are final and being read out).
 */

/** Deliberately slow: see the `inFlight` comment for what one refresh costs. */
const AUTO_REFRESH_MS = 20000;
const RoundStandings = () => {
	const { formatMessage: tr } = useIntl();
	const { round } = useContext(Context);
	const searchParams = useSearch({ strict: false });
	const roundId = searchParams.roundId || round?.id;

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	// Column sort; the default (key null) keeps the server's round ranking.
	const [sort, setSort] = useState({ key: null, dir: "asc" });
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [lastUpdated, setLastUpdated] = useState(null);
	// Guards the poll: one summary costs the backend a sequential /game/result
	// per question in the round (20+ during a real event, 10 s timeout each), so
	// a slow response must never let ticks pile up on top of each other.
	const inFlight = useRef(false);

	/** @param background true for a poll tick -- keeps the table on screen. */
	const fetchSummary = async ({ background = false } = {}) => {
		if (!roundId || inFlight.current) return;
		inFlight.current = true;
		if (!background) setLoading(true);
		try {
			const next = await api.get(
				`${SERVICE_API}/round/${roundId}/hexudon-summary`,
			);
			setData(next);
			setError(null);
			setLastUpdated(new Date());
		} catch (e) {
			debugError("round standings", e);
			setError(e.response?.data?.message || e.message);
			// A failed POLL keeps the last good table up: blanking the standings
			// mid-event over one hiccup is worse than showing slightly stale
			// numbers next to the error.
			if (!background) setData(null);
		} finally {
			inFlight.current = false;
			if (!background) setLoading(false);
		}
	};

	useEffect(() => {
		fetchSummary();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roundId]);

	// Poll while the tab is visible. Hidden tabs are skipped (a projector left
	// on another window should not keep hammering the engine), and becoming
	// visible again refreshes immediately rather than waiting out the interval.
	useEffect(() => {
		if (!autoRefresh || !roundId) return undefined;
		const tick = () => {
			if (document.visibilityState === "visible") {
				fetchSummary({ background: true });
			}
		};
		const id = setInterval(tick, AUTO_REFRESH_MS);
		document.addEventListener("visibilitychange", tick);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", tick);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoRefresh, roundId]);

	const handleExport = async () => {
		try {
			const response = await fetch(
				`${SERVICE_API}/round/${roundId}/hexudon-summary/export`,
				{ headers: { Authorization: `${localStorage.getItem("token")}` } },
			);
			if (!response.ok) throw new Error(`export failed (${response.status})`);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `hexudon_round_${roundId}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (e) {
			setError(e.message);
		}
	};

	const matches = data?.matches || [];
	const teams = data?.teams || [];

	// Click-to-sort. `null` key = the server's own order (round rank).
	const sortValue = (team, key) => {
		if (key === "team") return team.team_name?.toLowerCase() ?? "";
		if (key === "counted") return team.matches_counted;
		if (key === "points") return team.rank_points;
		if (key?.startsWith("match:")) {
			// A match the team was not rostered for has no position at all.
			return team.per_match?.[key.slice(6)]?.position ?? null;
		}
		return team.rank; // "rank"
	};

	const sortedTeams = useMemo(() => {
		if (!sort.key) return teams;
		const dir = sort.dir === "desc" ? -1 : 1;
		return [...teams].sort((a, b) => {
			const av = sortValue(a, sort.key);
			const bv = sortValue(b, sort.key);
			// Teams with no value for this column (unranked, or absent from that
			// match) always sit at the bottom, whichever way the column is sorted.
			const aMissing = av === null || av === undefined;
			const bMissing = bv === null || bv === undefined;
			if (aMissing !== bMissing) return aMissing ? 1 : -1;
			if (aMissing && bMissing) return 0;
			if (typeof av === "string") return av.localeCompare(bv) * dir;
			return (av - bv) * dir;
		});
	}, [teams, sort]);

	const toggleSort = (key) =>
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: "asc" },
		);

	const headCell = (key, label, align, reactKey) => (
		<mui.TableCell
			key={reactKey ?? key}
			align={align}
			sortDirection={sort.key === key ? sort.dir : false}
		>
			<mui.TableSortLabel
				active={sort.key === key}
				direction={sort.key === key ? sort.dir : "asc"}
				onClick={() => toggleSort(key)}
			>
				{label}
			</mui.TableSortLabel>
		</mui.TableCell>
	);

	// Placed after every hook: an early return above useMemo would make that
	// hook conditional, which React rejects on the next render.
	if (!roundId) {
		return (
			<mui.Box sx={{ p: 3 }}>
				<mui.Alert severity="info">{tr({ id: "standings.pickRound" })}</mui.Alert>
			</mui.Box>
		);
	}

	// A team's cell in a match column: the position it scored there. A team that
	// was on the roster but never competed still scores -- the match's last
	// position -- so the number is shown, flagged, rather than hidden.
	const cellFor = (team, match) => {
		const cell = team.per_match?.[match.question_id];
		if (!cell) {
			return (
				<mui.Tooltip title={tr({ id: "standings.notInRoster" })}>
					<span style={{ opacity: 0.4 }}>—</span>
				</mui.Tooltip>
			);
		}
		if (!cell.competed) {
			return (
				<mui.Tooltip title={tr({ id: "standings.dnpHint" })}>
					<mui.Chip
						size="small"
						color="warning"
						variant="outlined"
						label={`${cell.position} · ${tr({ id: "standings.dnp" })}`}
					/>
				</mui.Tooltip>
			);
		}
		return (
			<mui.Chip
				size="small"
				color={cell.position === 1 ? "success" : "default"}
				variant={cell.position === 1 ? "filled" : "outlined"}
				label={cell.position}
			/>
		);
	};

	return (
		<>
			<PageToolbar
				title={tr({ id: "standings.title" })}
				actions={[
					{
						key: "refresh",
						icon: <RefreshIcon />,
						onClick: () => fetchSummary(),
						tooltip: tr({ id: "Refresh" }),
					},
				]}
				customBtns={[
					{
						label: autoRefresh
							? tr({ id: "standings.autoOn" })
							: tr({ id: "standings.autoOff" }),
						icon: autoRefresh ? <PauseIcon /> : <PlayIcon />,
						fn: () => setAutoRefresh((on) => !on),
						color: autoRefresh ? "primary" : "inherit",
					},
					{
						label: tr({ id: "export-to-excel" }),
						icon: <DownloadIcon />,
						fn: handleExport,
						color: "success",
					},
				]}
			/>

			<mui.Paper component="main" sx={{ pt: 0, pb: 4, px: 2 }}>
				<mui.Stack spacing={2} sx={{ pt: 2 }}>
					{lastUpdated && (
						<mui.Typography variant="caption" color="text.secondary">
							{tr({ id: "standings.updatedAt" })}{" "}
							{lastUpdated.toLocaleTimeString()}
							{autoRefresh
								? ` - ${tr({ id: "standings.autoEvery" })} ${AUTO_REFRESH_MS / 1000}s`
								: ` - ${tr({ id: "standings.autoPaused" })}`}
						</mui.Typography>
					)}
					{error && <mui.Alert severity="error">{error}</mui.Alert>}
					{loading && <mui.LinearProgress />}

					{!loading && !error && !teams.length && (
						<mui.Alert severity="warning">{tr({ id: "standings.empty" })}</mui.Alert>
					)}

					{!!teams.length && (
						// A round can hold many matches, so the table scrolls sideways
						// instead of squeezing the columns; minWidth keeps each match
						// column readable rather than letting the browser shrink them.
						<mui.TableContainer
							component={mui.Paper}
							variant="outlined"
							sx={{ overflowX: "auto" }}
						>
							<mui.Table
								size="small"
								stickyHeader
								sx={{ minWidth: 420 + matches.length * 110 }}
							>
								<mui.TableHead>
									<mui.TableRow>
										{headCell("rank", "#", "left")}
										{headCell("team", tr({ id: "hexudon.standings.team" }), "left")}
										{matches.map((m) =>
											headCell(
												`match:${m.question_id}`,
												<>
													<mui.Typography variant="caption" display="block">
														{m.match_name}
													</mui.Typography>
													{m.question_name}
												</>,
												"center",
												m.question_id,
											),
										)}
										{headCell(
											"counted",
											tr({ id: "standings.matchesCounted" }),
											"right",
										)}
										{headCell(
											"points",
											<b>{tr({ id: "standings.rankPoints" })}</b>,
											"right",
										)}
									</mui.TableRow>
								</mui.TableHead>
								<mui.TableBody>
									{sortedTeams.map((team) => (
										<mui.TableRow key={team.team_id} hover>
											<mui.TableCell>{team.rank ?? "—"}</mui.TableCell>
											<mui.TableCell>{team.team_name}</mui.TableCell>
											{matches.map((m) => (
												<mui.TableCell key={m.question_id} align="center">
													{cellFor(team, m)}
												</mui.TableCell>
											))}
											<mui.TableCell align="right">
												{team.matches_counted}
												{team.matches_missed > 0 && (
													<mui.Typography
														variant="caption"
														color="warning.main"
														sx={{ ml: 0.5 }}
													>
														({team.matches_missed} {tr({ id: "standings.dnp" })})
													</mui.Typography>
												)}
											</mui.TableCell>
											<mui.TableCell align="right">
												<b>{team.rank_points}</b>
											</mui.TableCell>
										</mui.TableRow>
									))}
								</mui.TableBody>
							</mui.Table>
						</mui.TableContainer>
					)}

					{/* Matches the engine could not score (practice questions, games
					    never initialised) are deliberately NOT shown here -- they stay
					    in the API response and in the export's "Not scored" sheet. */}
				</mui.Stack>
			</mui.Paper>
		</>
	);
};

RoundStandings.wName = "RoundStandings";

export default RoundStandings;
