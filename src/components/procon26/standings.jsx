import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { useIntl } from "react-intl";

/**
 * Ranking table from GET /game/result. The official tie-break order:
 * distinct udon types, cumulative daily distinct types, total servings,
 * lowest cumulative response time.
 */
const Standings = ({ result, ownTeamId, teamNames = {} }) => {
	const { formatMessage: tr } = useIntl();
	if (!result?.ranking?.length) {
		return <Typography color="textSecondary">{tr({ id: "hexudon.standings.empty" })}</Typography>;
	}

	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>#</TableCell>
						<TableCell>{tr({ id: "hexudon.standings.team" })}</TableCell>
						<TableCell align="right">{tr({ id: "hexudon.standings.distinct" })}</TableCell>
						<TableCell align="right">{tr({ id: "hexudon.standings.daily" })}</TableCell>
						<TableCell align="right">{tr({ id: "hexudon.standings.servings" })}</TableCell>
						<TableCell align="right">{tr({ id: "hexudon.standings.response" })}</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{result.ranking.map((teamId, index) => {
						const detail = result.detail?.[teamId] || {};
						const own = String(teamId) === String(ownTeamId);
						return (
							<TableRow key={teamId} selected={own}>
								<TableCell>{index + 1}</TableCell>
								<TableCell sx={{ fontWeight: own ? "bold" : "normal" }}>
									{teamNames[teamId] || teamId}
									{own ? ` (${tr({ id: "hexudon.standings.you" })})` : ""}
								</TableCell>
								<TableCell align="right">{detail.distinct_types}</TableCell>
								<TableCell align="right">{detail.cumulative_daily_types}</TableCell>
								<TableCell align="right">{detail.total_servings}</TableCell>
								<TableCell align="right">{detail.cumulative_response_time}s</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

export default Standings;
