import * as mui from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import { useContext, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { useIntl } from "react-intl";
import CodeEditor from "../components/code-editor";
import AccordionBoard from "../components/procon25/accordion-board";
import ScoreData from "../components/procon25/score-data";
import AnswerBoard from "../components/procon25/answer-board";
import GameBoard from "../components/procon25/game-board";
import Context from "../context";
import { SERVICE_API } from "../config/env";

const useStyles = makeStyles({
	root: {
		// minWidth: "800px",
		minWidth: "60%",
	},
});

const UserAnswerDialog = ({ open, instance, close, save, handleChange }) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();
	const [isDisabled, setIsDisabled] = useState(true);

	if (!instance) return null;

	const question = instance.question;
	const answer = instance.answers[0];

	const questionData = JSON.parse(question?.question_data || "{}");
	const entities = questionData.field?.entities;
	// const startBoard = questionData.board?.start;
	// const goalBoard = questionData.board?.goal;
	// const general = questionData.general;

	const answerData = JSON.stringify({
		// n: 0,
		ops: [],
	});

	return (
		<mui.Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<mui.DialogTitle>
				{answer?.id ? "Edit Answer" : "Create Answer"}
			</mui.DialogTitle>
			<mui.DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<mui.Stack spacing={1}>
					<CodeEditor
						title="Answer Data"
						height="180px"
						defaultValue={answerData}
						subTitle={question?.description || "Write your answer here!"}
						onValueChange={(value) => {
							handleChange({ answer_data: value });
							setIsDisabled(false);
						}}
						onError={() => setIsDisabled(true)}
					/>
					<mui.Stack spacing={0}>
						<AccordionBoard
							title={
								<mui.Box
									sx={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										width: "100%",
										pr: 2,
									}}>
									<span>Board</span>
								</mui.Box>
							}
							copyContent={entities}
							showCopy
							defaultExpanded>
							<GameBoard board={entities} />
						</AccordionBoard>
						{/* </AccordionBoard>
             <AccordionBoard
              title="Start Board"
              copyContent={startBoard}
              showCopy
            >
              <GameBoard board={startBoard} goal={goalBoard} />
            </AccordionBoard> */}
						{/* <AccordionBoard title="Goal Board" copyContent={goalBoard} showCopy>
              <GameBoard board={goalBoard} goal={goalBoard} />
            </AccordionBoard> */}
						{/* <AccordionBoard
              title="General Patterns"
              copyContent={general}
              showCopy
            >
              <CodeEditor defaultValue={general} readOnly />
            </AccordionBoard> */}
					</mui.Stack>
				</mui.Stack>
			</mui.DialogContent>
			<mui.DialogActions>
				<mui.Button onClick={close}>{tr({ id: "Cancel" })}</mui.Button>
				<mui.Button onClick={save} disabled={isDisabled}>
					{tr({ id: "Save" })}
				</mui.Button>
			</mui.DialogActions>
		</mui.Dialog>
	);
};

const useScoreStyle = makeStyles({
	root: {
		// minWidth: "60%",
		minWidth: "100%",
		minHeight: "100%",
	},
});

const ScoreDataDialog = ({ open, instance, close }) => {
	const classes = useScoreStyle();
	const [answer, setAnswer] = useState(null);
	const [scoreData, setScoreData] = useState({});
	const [sliderConfig, setSliderConfig] = useState({
		maxStep: 0,
		onChange: null,
	});
	const [loadingAnswer, setLoadingAnswer] = useState(false);
	const { team } = useContext(Context);
	const lastFetchedQuestionId = useRef(null);

	const handleSliderReady = useCallback((config) => {
		setSliderConfig(config);
	}, []);

	// Fetch full answer data for a specific answer
	const fetchFullAnswer = useCallback(async (answerMetadata) => {
		// If answer already has full data, just use it
		if (answerMetadata.answer_data) {
			setAnswer(answerMetadata);
			return;
		}

		setLoadingAnswer(true);
		try {
			const fullAnswer = await axios.get(
				`${SERVICE_API}/answer/${answerMetadata.id}`,
				{
					headers: {
						Authorization: localStorage.getItem("token"),
					},
				}
			);
			setAnswer(fullAnswer.data);
		} catch (error) {
			console.error("Failed to fetch full answer:", error);
			setAnswer(answerMetadata);
		} finally {
			setLoadingAnswer(false);
		}
	}, []);

	// Handle team selection from dropdown
	const handleTeamSelect = useCallback(
		(index, answersArray) => {
			const selectedAnswer = answersArray[index];
			fetchFullAnswer(selectedAnswer);
		},
		[fetchFullAnswer]
	);

	// Load first answer when dialog opens and instance is ready
	useEffect(() => {
		const currentQuestionId = instance?.question?.id;

		// Only fetch if dialog is open, has answers, and we haven't fetched this question yet
		if (
			open &&
			instance?.answers?.[0] &&
			lastFetchedQuestionId.current !== currentQuestionId
		) {
			// Reset answer to prevent showing old data
			setAnswer(null);
			setScoreData({});
			fetchFullAnswer(instance.answers[0]);
			lastFetchedQuestionId.current = currentQuestionId;
		}

		// Reset tracking when dialog closes
		if (!open) {
			lastFetchedQuestionId.current = null;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, instance?.question?.id]);

	if (!instance) return null;

	const answers = instance.answers || [];
	const question = instance.question || {};
	const questionData = JSON.parse(question?.question_data || "{}");
	const startBoard = questionData.field?.entities;

	return (
		<mui.Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}
			maxWidth="xl"
			fullWidth
			slotProps={{
				paper: {
					sx: {
						height: "90vh",
						maxHeight: "90vh",
						overflow: "hidden",
					},
				},
			}}>
			<mui.DialogTitle>
				<mui.Stack
					direction={"row"}
					spacing={2}
					justifyContent={"space-between"}
					alignItems={"center"}>
					<mui.Stack direction={"row"} gap={3} alignItems={"center"}>
						<mui.Typography variant="h5" color={"blue"} fontSize={"22px"}>
							{answer?.team?.name}
						</mui.Typography>
						<ScoreData scores={scoreData} />
					</mui.Stack>
					<mui.Stack direction={"row"} alignItems={"center"} spacing={1}>
						<mui.FormControl variant="standard" sx={{ m: 1, width: 300 }}>
							{team.is_admin && answers.length > 0 && (
								<mui.Select
									defaultValue={0}
									onChange={(e) => handleTeamSelect(e.target.value, answers)}
									disabled={loadingAnswer}>
									{answers.map((asw, idx) => {
										return (
											<mui.MenuItem key={idx} value={idx}>
												{asw.team?.name}
											</mui.MenuItem>
										);
									})}
								</mui.Select>
							)}
						</mui.FormControl>
						<mui.IconButton onClick={close} size="small">
							<CloseIcon />
						</mui.IconButton>
					</mui.Stack>
				</mui.Stack>
			</mui.DialogTitle>
			<mui.DialogContent
				className={classes.root}
				style={{
					minWidth: 800,
					height: "calc(100% - 80px)",
					overflow: "hidden",
					paddingTop: 8,
					paddingBottom: 8,
				}}>
				{loadingAnswer ? (
					<mui.Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
						}}>
						<mui.CircularProgress />
					</mui.Box>
				) : answers.length === 0 ? (
					<mui.Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
						}}>
						<mui.Typography variant="h6" color="text.secondary">
							No answers submitted yet
						</mui.Typography>
					</mui.Box>
				) : (
					<mui.Stack
						direction="row"
						spacing={3}
						sx={{ height: "100%", maxHeight: "100%" }}>
						<mui.Stack spacing={2} sx={{ width: 300, flexShrink: 0 }}>
							<mui.TableContainer component={mui.Paper} variant="outlined">
								<mui.Table size="small">
									<mui.TableBody>
										<mui.TableRow>
											<mui.TableCell
												sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
												Score
											</mui.TableCell>
											<mui.TableCell
												align="right"
												sx={{
													fontWeight: "bold",
													color:
														scoreData?.match_count !==
														scoreData?.max_match_count
															? "red"
															: "#35ae35ff",
												}}>
												{!isNaN(scoreData?.match_count)
													? scoreData.match_count
													: "NA"}
												{scoreData?.match_count !==
													scoreData?.max_match_count &&
													!isNaN(scoreData?.match_count) && (
														<mui.Tooltip title="Điểm chưa đạt tối đa" arrow>
															<span
																style={{
																	marginLeft: 4,
																	cursor: "help",
																	color: "white",
																	backgroundColor: "#ccc",
																	display: "inline-block",
																	width: "20px",
																	textAlign: "center",
																	borderRadius: "50%",
																}}>
																?
															</span>
														</mui.Tooltip>
													)}
											</mui.TableCell>
										</mui.TableRow>
										<mui.TableRow>
											<mui.TableCell
												sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
												Max
											</mui.TableCell>
											<mui.TableCell
												align="right"
												sx={{
													fontWeight: "bold",
													color: "#35ae35ff",
												}}>
												{!isNaN(scoreData?.max_match_count)
													? scoreData?.max_match_count
													: "NA"}
											</mui.TableCell>
										</mui.TableRow>
										<mui.TableRow>
											<mui.TableCell
												sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
												Steps
											</mui.TableCell>
											<mui.TableCell
												align="right"
												sx={{ fontWeight: "bold", color: "#e0941bff" }}>
												{!isNaN(scoreData?.step_count)
													? scoreData?.step_count
													: "NA"}
											</mui.TableCell>
										</mui.TableRow>
										<mui.TableRow>
											<mui.TableCell
												sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
												Resub
											</mui.TableCell>
											<mui.TableCell
												align="right"
												sx={{ fontWeight: "bold", color: "#d648b7ff" }}>
												{!isNaN(scoreData?.resubmission_count)
													? scoreData?.resubmission_count
													: "NA"}
											</mui.TableCell>
										</mui.TableRow>
										<mui.TableRow>
											<mui.TableCell
												sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
												Last Submitted
											</mui.TableCell>
											<mui.TableCell align="right" sx={{ fontWeight: "bold" }}>
												{scoreData?.submitted_time ?? "NA"}
											</mui.TableCell>
										</mui.TableRow>
									</mui.TableBody>
								</mui.Table>
							</mui.TableContainer>
							{!!sliderConfig.maxStep && (
								<mui.Slider
									onChange={(_, val) => sliderConfig.onChange?.(val)}
									defaultValue={sliderConfig.maxStep}
									step={1}
									min={0}
									max={sliderConfig.maxStep}
									valueLabelDisplay="auto"
									key={sliderConfig.maxStep}
								/>
							)}
						</mui.Stack>
						<mui.Box
							sx={{
								flex: 1,
								display: "flex",
								justifyContent: "center",
								alignItems: "flex-start",
								height: "100%",
								overflow: "hidden",
							}}>
							{answer?.id ? (
								<AnswerBoard
									answerId={answer.id}
									answerData={answer}
									startBoard={startBoard}
									onChange={(score) => setScoreData(score)}
									onSliderReady={handleSliderReady}
									fillContainer
								/>
							) : (
								<mui.Typography variant="body2" color="text.secondary">
									No answer data
								</mui.Typography>
							)}
						</mui.Box>
					</mui.Stack>
				)}
			</mui.DialogContent>
		</mui.Dialog>
	);
};

export { ScoreDataDialog, UserAnswerDialog };
