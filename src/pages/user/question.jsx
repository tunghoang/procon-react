import "./question.css";
import { useContext, useState } from "react";
import {
	Box,
	Container,
	Grid,
	Typography,
	Toolbar,
	Button,
	Stack,
} from "@mui/material";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../../api";
import { UserAnswerDialog, ScoreDataDialog } from "../../dialogs/answer";
import CardData from "../../components/card-data";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import Context from "../../context";
import LoadingPage from "../../components/loading-page";
import { useParams, useSearch } from "@tanstack/react-router";

const UserQuestion = () => {
	const { userMatch } = useContext(Context);
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });

	// Get matchId from URL params first, then from context
	const matchId = routeParams.matchId || searchParams.matchId || searchParams.match_id || userMatch?.id;

	const [dialogName, setDialogName] = useState("");
	const [currentItem, setCurrentItem] = useState(null);
	const [payload, setPayload] = useState(null);
	const { formatMessage: tr } = useIntl();
	const { data: questions, loading: qloading } = useFetchData({
		path: "/question",
		name: "Question",
		config: {
			params: {
				"match[eq_id]": matchId,
			},
		},
	});
	const {
		data: answers,
		refetch,
		loading: aloading,
	} = useFetchData({
		path: "/answer",
		name: "Answer",
		config: {
			params: {
				"match[eq_id]": matchId,
			},
		},
	});
	const { apiCreate } = useApi("/answer", "Answer");

	const closeDialog = () => {
		setDialogName("");
	};

	const saveInstance = async () => {
		const result = await apiCreate(payload);
		if (result) await refetch();
		setDialogName("");
	};
	const changeInstance = (changes) => {
		setPayload({ ...payload, ...changes });
	};

	if (!matchId) {
		return (
			<>
				<DashboardNavbar
					position="fixed"
					sx={{ left: 0, width: "100%" }}
				/>
				<Box sx={{ pt: 10, minHeight: "100vh" }} className="UserQuestion">
					<Container maxWidth="lg">
						<Typography variant="h5" color="error">
							Please select a match to view questions
						</Typography>
					</Container>
				</Box>
			</>
		);
	}

	if (qloading || aloading) return <LoadingPage />;

	const renderQuestions = () => {
		if (!questions.length)
			return (
				<Typography
					variant="h4"
					m="auto"
					sx={{
						opacity: 0.3,
						verticalAlign: "middle",
						lineHeight: "300px",
					}}>
					No questions available
				</Typography>
			);

		return questions.map((question) => {
			const uAnswers = answers.filter(
				(item) => item.question_id === question.id
			);
			const questionData = JSON.parse(question.question_data || "{}");
			return (
				<Grid key={question.id} size={{ lg: 4, md: 6, xs: 12 }}>
					<CardData
						name={question.name}
						description={
							<Stack alignItems={"flex-start"}>
								<div
									style={{
										textAlign: "left",
										marginBottom: "12px",
									}}>
									<div className="data-item">
										<span>ID:</span> {question.id}
									</div>
									<div className="data-item">
										<span>Size:</span> {questionData.field?.size}
									</div>
									{/* <div className="data-item">
                    <span>Width:</span> {questionData.board?.width}
                  </div>
                  <div className="data-item">
                    <span>Height:</span>{" "}
                    {questionData.board?.height}
                  </div>
                  <div className="data-item">
                    <span>General patterns:</span>{" "}
                    {questionData.general?.n}
                  </div> */}
								</div>
								{/* <div>
                    Start Time: {formatDateTime(question.start_time)}
                  </div>
                  <div>
                    End Time: {formatDateTime(question.end_time)}
                  </div> */}
							</Stack>
						}
						handleSelect={() => {
							setDialogName("UserAnswerDialog");
							setCurrentItem({
								answers: uAnswers,
								question,
							});
							setPayload({
								question_id: question.id,
							});
						}}
						showAction={!!uAnswers.length}
						action={
							uAnswers.length && (
								<Button
									onClick={() => {
										setDialogName("ScoreDataDialog");
										setCurrentItem({
											answers: uAnswers,
											question,
										});
									}}>
									<SportsScoreIcon color="action" />
									<Typography
										color="textSecondary"
										display="inline"
										sx={{ pl: 1 }}
										variant="body2">
										{tr({ id: "Score" })}
									</Typography>
								</Button>
							)
						}
					/>
				</Grid>
			);
		});
	};

	return (
		<>
			<DashboardNavbar
				position="fixed"
				sx={{ left: 0, width: "100%" }}
			/>
			<Box sx={{ pt: 10, minHeight: "100vh" }} className="UserQuestion">
				<Container maxWidth="lg">
					<Typography variant="h5">{tr({ id: "Questions" })}</Typography>
					<Toolbar />
					<Grid container spacing={3}>
						{renderQuestions()}
					</Grid>
				</Container>
			</Box>
			{dialogName === "UserAnswerDialog" && (
				<UserAnswerDialog
					open={dialogName === "UserAnswerDialog"}
					instance={currentItem}
					close={closeDialog}
					save={saveInstance}
					handleChange={changeInstance}
				/>
			)}
			{dialogName === "ScoreDataDialog" && (
				<ScoreDataDialog
					open={dialogName === "ScoreDataDialog"}
					instance={currentItem}
					close={closeDialog}
					disabled
				/>
			)}
		</>
	);
};

export default UserQuestion;
