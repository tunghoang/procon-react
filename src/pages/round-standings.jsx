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
import {
	DEFAULT_CONFIG,
	buildGroupStandings,
	coefFor,
	toCsv,
} from "../utils/group-standings";

/**
 * HEXUDON round standings (STAFF: the superadmin sees the whole round, a group
 * manager gets the same endpoint narrowed to its own group's matches).
 *
 * One fetch, two ways of scoring it, switchable in the settings bar:
 *
 *   "coef" (default) -- how the organiser scores the event, ported from
 *   scripts/standings.html: match points = coefficient(match no) x rank point,
 *   highest total wins, one table per GROUP. Groups/match numbers come from the
 *   question name `<round>.<group>.<match>` (1.A.2); questions named otherwise
 *   are grouped by their match name and numbered by their order in the match.
 *   Coefficients, the rank-point ladder and the DNP rule are knobs on the page
 *   and are recomputed locally from the last response (no refetch). Rules live
 *   in utils/group-standings.js.
 *
 *   "positions" -- the backend's own total: every match is ranked by the
 *   engine, a team's score is its FINISHING POSITION (1st = 1) and the SMALLEST
 *   total wins. A rostered team that never competed takes that match's LAST
 *   position ("N · DNP"). This is also what the Excel export contains.
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
const CFG_KEY = "hexudon.standings.cfg";

const loadConfig = () => {
	try {
		const saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
		return {
			...DEFAULT_CONFIG,
			...saved,
			coefs: Array.isArray(saved.coefs) ? saved.coefs : DEFAULT_CONFIG.coefs,
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
};

const fmt = (n) => (Math.round(n * 100) / 100).toString();

const RoundStandings = () => {
	const { formatMessage: tr } = useIntl();
	const { round } = useContext(Context);
	const searchParams = useSearch({ strict: false });
	const roundId = searchParams.roundId || round?.id;

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	// Column sort of the "positions" table; the default (key null) keeps the
	// server's round ranking.
	const [sort, setSort] = useState({ key: null, dir: "asc" });
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [lastUpdated, setLastUpdated] = useState(null);
	const [config, setConfig] = useState(loadConfig);
	// Guards the poll: one summary costs the backend a sequential /game/result
	// per question in the round (20+ during a real event, 10 s timeout each), so
	// a slow response must never let ticks pile up on top of each other.
	const inFlight = useRef(false);

	useEffect(() => {
		try {
			localStorage.setItem(CFG_KEY, JSON.stringify(config));
		} catch {
			/* private mode etc. -- the knobs just do not persist */
		}
	}, [config]);

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

	const handleExportExcel = async () => {
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
	const coefMode = config.mode !== "positions";

	// Grouped scoring is recomputed from the cached response whenever a knob
	// changes -- no refetch, same discipline as the standalone page.
	const grouped = useMemo(
		() => buildGroupStandings(data, config),
		[data, config],
	);

	const handleExportCsv = () => {
		const csv = toCsv(grouped, {
			group: tr({ id: "standings.groupCol" }),
			team: tr({ id: "hexudon.standings.team" }),
			position: tr({ id: "standings.positionCol" }),
			points: tr({ id: "standings.pointsCol" }),
			total: tr({ id: "standings.total" }),
			dnp: tr({ id: "standings.dnp" }),
		});
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `hexudon_round_${roundId}_groups.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	};

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

	const setCoef = (n, value) =>
		setConfig((prev) => {
			const coefs = [...prev.coefs];
			while (coefs.length < n) coefs.push(coefFor(coefs, coefs.length + 1));
			coefs[n - 1] = value === "" ? "" : Number(value);
			return { ...prev, coefs };
		});

	// Coefficient inputs: one per match number seen in the round, at least 1..4
	// so the spreadsheet's defaults are visible even before the round has data.
	const coefNos = Array.from(
		{ length: Math.max(4, ...grouped.matchNos) },
		(_, i) => i + 1,
	);

	// A team's cell in a "positions" match column: the position it scored
	// there. A team that was on the roster but never competed still scores --
	// the match's last position -- so the number is shown, flagged, not hidden.
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

	// A team's cell in a group table: the points it took, with the position (or
	// the DNP flag) underneath, as on the standalone page.
	const groupCellFor = (team, column) => {
		const c = team.cells[column.question_id];
		if (!c) return <span style={{ opacity: 0.4 }}>—</span>;
		return (
			<mui.Tooltip
				title={
					c.dnp
						? tr({ id: "standings.dnpHint" })
						: `${c.rp} × ${fmt(c.coef)} = ${fmt(c.pts)}`
				}
			>
				<mui.Box sx={{ lineHeight: 1.2 }}>
					<b>{fmt(c.pts)}</b>
					<mui.Typography
						variant="caption"
						display="block"
						color={c.dnp ? "warning.main" : "text.secondary"}
					>
						{c.dnp
							? tr({ id: "standings.dnp" })
							: tr({ id: "standings.position" }, { n: c.position })}
					</mui.Typography>
				</mui.Box>
			</mui.Tooltip>
		);
	};

	const settingsBar = (
		<mui.Stack
			direction="row"
			spacing={2}
			useFlexGap
			flexWrap="wrap"
			alignItems="center"
		>
			<mui.TextField
				select
				size="small"
				label={tr({ id: "standings.mode" })}
				value={coefMode ? "coef" : "positions"}
				onChange={(e) => setConfig((prev) => ({ ...prev, mode: e.target.value }))}
				sx={{ minWidth: 260 }}
			>
				<mui.MenuItem value="coef">{tr({ id: "standings.mode.coef" })}</mui.MenuItem>
				<mui.MenuItem value="positions">
					{tr({ id: "standings.mode.positions" })}
				</mui.MenuItem>
			</mui.TextField>
			{coefMode && (
				<>
					<mui.Typography variant="body2" color="text.secondary">
						{tr({ id: "standings.coef" })}
					</mui.Typography>
					{coefNos.map((n) => (
						<mui.TextField
							key={n}
							size="small"
							type="number"
							inputProps={{ step: 0.05, min: 0 }}
							label={tr({ id: "standings.matchNo" }, { n })}
							value={config.coefs[n - 1] ?? coefFor(config.coefs, n)}
							onChange={(e) => setCoef(n, e.target.value)}
							sx={{ width: 96 }}
						/>
					))}
					<mui.TextField
						select
						size="small"
						label={tr({ id: "standings.scale" })}
						value={config.scale}
						onChange={(e) => setConfig((prev) => ({ ...prev, scale: e.target.value }))}
						sx={{ minWidth: 220 }}
					>
						<mui.MenuItem value="fixed">{tr({ id: "standings.scale.fixed" })}</mui.MenuItem>
						<mui.MenuItem value="group">{tr({ id: "standings.scale.group" })}</mui.MenuItem>
					</mui.TextField>
					<mui.TextField
						select
						size="small"
						label={tr({ id: "standings.dnpRule" })}
						value={config.dnp}
						onChange={(e) => setConfig((prev) => ({ ...prev, dnp: e.target.value }))}
						sx={{ minWidth: 200 }}
					>
						<mui.MenuItem value="zero">{tr({ id: "standings.dnpRule.zero" })}</mui.MenuItem>
						<mui.MenuItem value="rank">{tr({ id: "standings.dnpRule.rank" })}</mui.MenuItem>
					</mui.TextField>
				</>
			)}
		</mui.Stack>
	);

	const groupTables = (
		<mui.Box
			sx={{
				display: "grid",
				gap: 2,
				gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
			}}
		>
			{grouped.groups.map((g) => (
				<mui.Paper key={g.group} variant="outlined" sx={{ p: 1.5 }}>
					<mui.Typography variant="subtitle1" sx={{ mb: 0.5 }}>
						{tr({ id: "standings.group" }, { g: g.group })}{" "}
						<mui.Typography component="span" variant="caption" color="text.secondary">
							— {tr({ id: "standings.topPoints" }, { n: g.scaleTop })}
							{!g.fromName && ` · ${tr({ id: "standings.groupFromMatch" })}`}
						</mui.Typography>
					</mui.Typography>
					<mui.TableContainer sx={{ overflowX: "auto" }}>
						{/* Sized so a 4-match group fits one grid cell without a
						    horizontal scroll (the total must stay in view). */}
						<mui.Table size="small" sx={{ minWidth: 180 + g.columns.length * 80 }}>
							<mui.TableHead>
								<mui.TableRow>
									<mui.TableCell>#</mui.TableCell>
									<mui.TableCell>{tr({ id: "hexudon.standings.team" })}</mui.TableCell>
									{g.columns.map((c) => (
										<mui.TableCell key={c.question_id} align="center">
											<mui.Tooltip title={`${c.match_name} · ${c.question_name}`}>
												<mui.Box sx={{ lineHeight: 1.2 }}>
													{tr({ id: "standings.matchNo" }, { n: c.matchNo })}
													<mui.Typography
														variant="caption"
														display="block"
														color="text.secondary"
													>
														×{fmt(c.coef)}
													</mui.Typography>
												</mui.Box>
											</mui.Tooltip>
										</mui.TableCell>
									))}
									<mui.TableCell align="right">
										<b>{tr({ id: "standings.total" })}</b>
									</mui.TableCell>
								</mui.TableRow>
							</mui.TableHead>
							<mui.TableBody>
								{g.teams.map((t) => (
									<mui.TableRow key={t.team_id} hover>
										<mui.TableCell>{t.rank}</mui.TableCell>
										<mui.TableCell sx={{ fontWeight: t.rank === 1 ? 600 : 400 }}>
											{t.team_name}
										</mui.TableCell>
										{g.columns.map((c) => (
											<mui.TableCell key={c.question_id} align="center">
												{groupCellFor(t, c)}
											</mui.TableCell>
										))}
										<mui.TableCell align="right">
											<b>{fmt(t.total)}</b>
										</mui.TableCell>
									</mui.TableRow>
								))}
							</mui.TableBody>
						</mui.Table>
					</mui.TableContainer>
				</mui.Paper>
			))}
		</mui.Box>
	);

	const positionsTable = (
		// A round can hold many matches, so the table scrolls sideways instead
		// of squeezing the columns; minWidth keeps each match column readable
		// rather than letting the browser shrink them.
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
						{headCell("counted", tr({ id: "standings.matchesCounted" }), "right")}
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
	);

	return (
		<>
			<PageToolbar
				title={tr({ id: "standings.title" })}
				customBtns={[
					// PageToolbar has no `actions` prop, so the manual refresh is
					// an ordinary button -- needed once auto-refresh is paused.
					{
						label: tr({ id: "Refresh" }),
						icon: <RefreshIcon />,
						fn: () => fetchSummary(),
						color: "inherit",
					},
					{
						label: autoRefresh
							? tr({ id: "standings.autoOn" })
							: tr({ id: "standings.autoOff" }),
						icon: autoRefresh ? <PauseIcon /> : <PlayIcon />,
						fn: () => setAutoRefresh((on) => !on),
						color: autoRefresh ? "primary" : "inherit",
					},
					coefMode
						? {
								label: tr({ id: "standings.exportCsv" }),
								icon: <DownloadIcon />,
								fn: handleExportCsv,
								color: "success",
							}
						: {
								label: tr({ id: "export-to-excel" }),
								icon: <DownloadIcon />,
								fn: handleExportExcel,
								color: "success",
							},
				]}
			/>

			<mui.Paper component="main" sx={{ pt: 0, pb: 4, px: 2 }}>
				<mui.Stack spacing={2} sx={{ pt: 2 }}>
					{settingsBar}
					{coefMode && (
						<mui.Typography variant="caption" color="text.secondary">
							{tr({ id: "standings.coefNote" })}
						</mui.Typography>
					)}
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

					{!!teams.length && (coefMode ? groupTables : positionsTable)}

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
