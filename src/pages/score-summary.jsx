import * as mui from "@mui/material";
import { useIntl } from "react-intl";
import React, { useContext, useState, useEffect } from "react";
import { api } from "../api/commons";
import PageToolbar from "../components/page-toolbar";
import Context from "../context";
import { useParams, useSearch } from "@tanstack/react-router";
import { debugLog, debugError } from "../utils/debug";
import RefreshIcon from "@mui/icons-material/Refresh";

const ScoreSummary = () => {
	const { formatMessage: tr } = useIntl();
	const { round } = useContext(Context);
	const searchParams = useSearch({ strict: false });
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState([]);

	const roundId = searchParams.roundId || round?.id;

	const fetchScoreSummary = async () => {
		if (!roundId) {
			debugError("No round ID provided");
			return;
		}

		setLoading(true);
		try {
			const response = await api.get(
				`${import.meta.env.VITE_SERVICE_API}/answer/summary`,
				{
					params: { round_id: roundId },
				}
			);
			debugLog("Score summary data:", response);
			setData(response || []);
		} catch (error) {
			debugError("Error fetching score summary:", error);
			setData([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchScoreSummary();
	}, [roundId]);

	if (!roundId) {
		return (
			<mui.Box sx={{ p: 3 }}>
				<mui.Typography color="error">
					Please select a round to view score summary
				</mui.Typography>
			</mui.Box>
		);
	}

	return (
		<>
			<PageToolbar
				title={tr({ id: "score-summary" })}
				actions={[
					{
						key: "refresh",
						icon: <RefreshIcon />,
						onClick: fetchScoreSummary,
						tooltip: "Refresh",
					},
				]}
			/>

			<mui.Paper component="main" sx={{ pt: 0, pb: 4, px: 2 }}>
				{loading ? (
					<mui.Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							minHeight: "400px",
						}}>
						<mui.CircularProgress />
					</mui.Box>
				) : (
					<mui.Box sx={{ mt: 3 }}>
						{data.length === 0 ? (
							<mui.Typography color="text.secondary">
								No data available
							</mui.Typography>
						) : (
							data.map((matchData, matchIdx) => (
								<mui.Paper
									key={matchIdx}
									sx={{
										mb: 4,
									}}>
									<mui.Box
										sx={{
											p: 2,
											backgroundColor: "primary.main",
											color: "white",
										}}>
										<mui.Typography variant="h6">
											{matchData.match}
										</mui.Typography>
									</mui.Box>

									<mui.TableContainer>
										<mui.Table size="small">
											<mui.TableHead>
												<mui.TableRow>
													<mui.TableCell
														rowSpan={2}
														sx={{
															fontWeight: "bold",
															backgroundColor: "#f5f5f5",
															position: "sticky",
															top: 0,
															zIndex: 2,
														}}>
														STT
													</mui.TableCell>
													<mui.TableCell
														rowSpan={2}
														sx={{
															fontWeight: "bold",
															backgroundColor: "#f5f5f5",
															position: "sticky",
															top: 0,
															zIndex: 2,
															minWidth: 150,
														}}>
														Team
													</mui.TableCell>
													{matchData.questions.map((q) => (
														<mui.TableCell
															key={q}
															colSpan={3}
															align="center"
															sx={{
																fontWeight: "bold",
																backgroundColor: "#e3f2fd",
																borderLeft: "2px solid #90caf9",
															}}>
															{q}
														</mui.TableCell>
													))}
													<mui.TableCell
														colSpan={3}
														align="center"
														sx={{
															fontWeight: "bold",
															backgroundColor: "#fff3e0",
															borderLeft: "2px solid #ffb74d",
														}}>
														Sum
													</mui.TableCell>
												</mui.TableRow>
												<mui.TableRow
													sx={{ borderBottom: "1px solid #e0e0e0" }}>
													{matchData.questions.map((q, idx) => (
														<React.Fragment key={q}>
															<mui.TableCell
																align="center"
																sx={{
																	fontWeight: "bold",
																	fontSize: "0.75rem",
																	backgroundColor: "#f5f5f5",
																	borderLeft: "2px solid #90caf9",
																}}>
																Match score
															</mui.TableCell>
															<mui.TableCell
																align="center"
																sx={{
																	fontWeight: "bold",
																	fontSize: "0.75rem",
																	backgroundColor: "#f5f5f5",
																}}>
																Step
															</mui.TableCell>
															<mui.TableCell
																align="center"
																sx={{
																	fontWeight: "bold",
																	fontSize: "0.75rem",
																	backgroundColor: "#f5f5f5",
																}}>
																Resub
															</mui.TableCell>
														</React.Fragment>
													))}
													<mui.TableCell
														align="center"
														sx={{
															fontWeight: "bold",
															fontSize: "0.75rem",
															backgroundColor: "#fff3e0",
															borderLeft: "2px solid #ffb74d",
														}}>
														Match score
													</mui.TableCell>
													<mui.TableCell
														align="center"
														sx={{
															fontWeight: "bold",
															fontSize: "0.75rem",
															backgroundColor: "#fff3e0",
														}}>
														Step
													</mui.TableCell>
													<mui.TableCell
														align="center"
														sx={{
															fontWeight: "bold",
															fontSize: "0.75rem",
															backgroundColor: "#fff3e0",
														}}>
														Resub
													</mui.TableCell>
												</mui.TableRow>
											</mui.TableHead>
											<mui.TableBody>
												{matchData.data.map((row) => (
													<mui.TableRow
														key={row.stt}
														hover
														sx={{
															borderBottom: "1px solid #e0e0e0",
															backgroundColor:
																row.stt % 2 !== 0 ? "white" : "#fafbfc",
														}}>
														<mui.TableCell
															align="center"
															sx={{ borderBottom: "unset" }}>
															{row.stt}
														</mui.TableCell>
														<mui.TableCell sx={{ borderBottom: "unset" }}>
															<mui.Typography
																sx={{
																	fontWeight: 500,
																}}>
																{row.team}
															</mui.Typography>
														</mui.TableCell>
														{matchData.questions.map((q, idx) => {
															const questionData = row.questions[q] || {
																match_score: 0,
																step: 0,
																resub: 0,
															};
															return (
																<React.Fragment key={q}>
																	<mui.TableCell
																		align="center"
																		sx={{
																			borderLeft: "2px solid #90caf9",
																			borderBottom: "unset",
																		}}>
																		<mui.Typography
																			sx={{
																				color:
																					questionData.match_score > 0
																						? "success.main"
																						: "text.secondary",
																				fontWeight:
																					questionData.match_score > 0
																						? 600
																						: 400,
																			}}>
																			{questionData.match_score}
																		</mui.Typography>
																	</mui.TableCell>
																	<mui.TableCell
																		align="center"
																		sx={{ borderBottom: "unset" }}>
																		<mui.Typography
																			sx={{
																				color:
																					questionData.step > 0
																						? "warning.main"
																						: "text.secondary",
																			}}>
																			{questionData.step}
																		</mui.Typography>
																	</mui.TableCell>
																	<mui.TableCell
																		align="center"
																		sx={{ borderBottom: "unset" }}>
																		<mui.Typography
																			sx={{
																				color:
																					questionData.resub > 0
																						? "error.main"
																						: "text.secondary",
																			}}>
																			{questionData.resub}
																		</mui.Typography>
																	</mui.TableCell>
																</React.Fragment>
															);
														})}
														<mui.TableCell
															align="center"
															sx={{
																borderLeft: "2px solid #ffb74d",
																backgroundColor: "#fffbf5",
																borderBottom: "unset",
															}}>
															<mui.Typography
																sx={{
																	fontWeight: 700,
																	color: "success.main",
																	fontSize: "1rem",
																}}>
																{row.sum.match_score}
															</mui.Typography>
														</mui.TableCell>
														<mui.TableCell
															align="center"
															sx={{
																backgroundColor: "#fffbf5",
																borderBottom: "unset",
															}}>
															<mui.Typography
																sx={{
																	fontWeight: 700,
																	color: "warning.main",
																	fontSize: "1rem",
																}}>
																{row.sum.step}
															</mui.Typography>
														</mui.TableCell>
														<mui.TableCell
															align="center"
															sx={{
																backgroundColor: "#fffbf5",
																borderBottom: "unset",
															}}>
															<mui.Typography
																sx={{
																	fontWeight: 700,
																	color: "error.main",
																	fontSize: "1rem",
																}}>
																{row.sum.resub}
															</mui.Typography>
														</mui.TableCell>
													</mui.TableRow>
												))}
											</mui.TableBody>
										</mui.Table>
									</mui.TableContainer>
								</mui.Paper>
							))
						)}
					</mui.Box>
				)}
			</mui.Paper>
		</>
	);
};

export default ScoreSummary;
