import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Stack,
	Typography,
	Select,
	MenuItem,
	FormControl,
	Box,
	Grid,
	TextField,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useContext, useState } from "react";
import { useIntl } from "react-intl";
import CodeEditor from "../components/code-editor";
import AccordionBoard from "../components/procon25/accordion-board";
import ScoreData from "../components/procon25/score-data";
import AnswerBoard from "../components/procon25/answer-board";
import GameBoard from "../components/procon25/game-board";
import Context from "../context";

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
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>{answer?.id ? "Edit Answer" : "Create Answer"}</DialogTitle>
			<DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<Stack spacing={1}>
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
					<Stack spacing={0}>
						<AccordionBoard
							title={
								<Box
									sx={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										width: "100%",
										pr: 2,
									}}>
									<span>Board</span>
									<Box sx={{ display: "flex", gap: 3, marginLeft: "16px" }}>
										<Typography variant="caption" color="textSecondary">
											Match: {question?.match_factor ?? 1.0}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											Step: {question?.step_factor ?? -0.05}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											Resub: {question?.resub_factor ?? -10.0}
										</Typography>
									</Box>
								</Box>
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
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
				<Button onClick={save} disabled={isDisabled}>
					{tr({ id: "Save" })}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

const useScoreStyle = makeStyles({
	root: {
		// minWidth: "60%",
		minWidth: "100%",
		minHeight: "100%",
	},
});

const ScoreDataDialog = ({
	open,
	instance,
	close,
	title = "Score Data",
	disabled = false,
}) => {
	const classes = useScoreStyle();
	const { formatMessage: tr } = useIntl();

	if (!instance) return null;

	const answers = instance.answers || [];
	const [answer, setAnswer] = useState(answers[0]);
	const [scoreData, setScoreData] = useState({});
	const { team } = useContext(Context);

	const question = instance.question || {};
	const questionData = JSON.parse(question?.question_data || "{}");
	const startBoard = questionData.field?.entities;
	// const startBoard = questionData.board?.start;
	// const goalBoard = questionData.board?.goal;
	// const general = questionData.general;

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>
				<Stack direction={"row"} spacing={2} justifyContent={"space-between"}>
					<Stack direction={"row"} gap={3} alignItems={"center"}>
						<Typography variant="h5" color={"blue"} fontSize={"22px"}>
							{answer?.team?.name}
						</Typography>
						<ScoreData scores={scoreData} />
					</Stack>
					<FormControl variant="standard" sx={{ m: 1, width: 120 }}>
						{team.is_admin && (
							<Select
								defaultValue={0}
								onChange={(e) => setAnswer(answers[e.target.value])}>
								{answers.map((asw, idx) => {
									return (
										<MenuItem key={idx} value={idx}>
											{asw.team?.name}
										</MenuItem>
									);
								})}
							</Select>
						)}
					</FormControl>
				</Stack>
			</DialogTitle>
			<DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<Stack spacing={3}>
					<CodeEditor
						title={title}
						defaultValue={scoreData}
						readOnly={disabled}
					/>
					<Stack spacing={0}>
						<AccordionBoard title="Answer Board" defaultExpanded>
							<AnswerBoard
								answerId={answer?.id}
								startBoard={startBoard}
								onChange={(score) => setScoreData(score)}
							/>
						</AccordionBoard>
						{/* <AccordionBoard title="Answer Board" defaultExpanded>
              <AnswerBoard
                answerId={answer?.id}
                startBoard={startBoard}
                goalBoard={goalBoard}
                general={general}
                onChange={(score) => setScoreData(score)}
              />
            </AccordionBoard>
            <AccordionBoard title="Start Board">
              <GameBoard board={startBoard} goal={goalBoard} />
            </AccordionBoard>
            <AccordionBoard title="Goal Board">
              <GameBoard board={goalBoard} goal={goalBoard} />
            </AccordionBoard> */}
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { ScoreDataDialog, UserAnswerDialog };
