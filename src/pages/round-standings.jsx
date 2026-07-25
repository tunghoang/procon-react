import * as mui from "@mui/material";
import { useIntl } from "react-intl";
import { useContext, useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
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
 * positions -- so the SMALLEST total wins. A match a team did not compete in
 * (not on the roster, or no agent kinds chosen) is skipped rather than counted
 * as a last place, which is why "Matches counted" sits next to every total.
 *
 * This is separate from the legacy /answer/summary page: HEXUDON teams submit
 * straight to the game service, so the manager's `answer` table is empty for
 * these matches and only /game/result has the scores.
 */
const RoundStandings = () => {
	const { formatMessage: tr } = useIntl();
	const { round } = useContext(Context);
	const searchParams = useSearch({ strict: false });
	const roundId = searchParams.roundId || round?.id;

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchSummary = async () => {
		if (!roundId) return;
		setLoading(true);
		setError(null);
		try {
			setData(await api.get(`${SERVICE_API}/round/${roundId}/hexudon-summary`));
		} catch (e) {
			debugError("round standings", e);
			setError(e.response?.data?.message || e.message);
			setData(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSummary();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roundId]);

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

	if (!roundId) {
		return (
			<mui.Box sx={{ p: 3 }}>
				<mui.Alert severity="info">{tr({ id: "standings.pickRound" })}</mui.Alert>
			</mui.Box>
		);
	}

	const matches = data?.matches || [];
	const teams = data?.teams || [];

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
						onClick: fetchSummary,
						tooltip: tr({ id: "Refresh" }),
					},
				]}
				customBtns={[
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
					<mui.Alert severity="info">{tr({ id: "standings.scoringNote" })}</mui.Alert>
					{error && <mui.Alert severity="error">{error}</mui.Alert>}
					{loading && <mui.LinearProgress />}

					{!loading && !error && !teams.length && (
						<mui.Alert severity="warning">{tr({ id: "standings.empty" })}</mui.Alert>
					)}

					{!!teams.length && (
						<mui.TableContainer component={mui.Paper} variant="outlined">
							<mui.Table size="small">
								<mui.TableHead>
									<mui.TableRow>
										<mui.TableCell>#</mui.TableCell>
										<mui.TableCell>{tr({ id: "hexudon.standings.team" })}</mui.TableCell>
										{matches.map((m) => (
											<mui.TableCell key={m.question_id} align="center">
												<mui.Typography variant="caption" display="block">
													{m.match_name}
												</mui.Typography>
												{m.question_name}
											</mui.TableCell>
										))}
										<mui.TableCell align="right">
											{tr({ id: "standings.matchesCounted" })}
										</mui.TableCell>
										<mui.TableCell align="right">
											<b>{tr({ id: "standings.rankPoints" })}</b>
										</mui.TableCell>
									</mui.TableRow>
								</mui.TableHead>
								<mui.TableBody>
									{teams.map((team) => (
										<mui.TableRow key={team.team_id} hover>
											<mui.TableCell>{team.rank ?? "—"}</mui.TableCell>
											<mui.TableCell>{team.team_name}</mui.TableCell>
											{matches.map((m) => (
												<mui.TableCell key={m.question_id} align="center">
													{cellFor(team, m)}
												</mui.TableCell>
											))}
											<mui.TableCell align="right">{team.matches_counted}</mui.TableCell>
											<mui.TableCell align="right">
												<b>{team.rank_points}</b>
											</mui.TableCell>
										</mui.TableRow>
									))}
								</mui.TableBody>
							</mui.Table>
						</mui.TableContainer>
					)}

					{!!data?.skipped?.length && (
						<mui.Alert severity="warning">
							<b>{tr({ id: "standings.notScored" })}</b>
							<ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
								{data.skipped.map((s) => (
									<li key={s.question_id}>
										{s.match_name} / {s.question_name} — {s.reason}
									</li>
								))}
							</ul>
						</mui.Alert>
					)}
				</mui.Stack>
			</mui.Paper>
		</>
	);
};

RoundStandings.wName = "RoundStandings";

export default RoundStandings;
