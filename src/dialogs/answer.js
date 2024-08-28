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
  Slider,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import CodeEditor from "../components/code-editor";
import GameBoard from "../components/procon24/game-board";
import AccordionBoard from "../components/procon24/accordion-board";
import ScoreData from "../components/procon24/score-data";
import AnswerBoard from "../components/procon24/answer-board";

const useStyles = makeStyles({
  root: {
    minWidth: "800px",
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
  // const answerData = answer?.answer_data;
  const answerData = JSON.stringify({
    n: 0,
    ops: [],
  });

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{answer?.id ? "Edit Answer" : "Create Answer"}</DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <Stack spacing={3}>
          <CodeEditor
            title="Answer Data"
            height="180px"
            defaultValue={answerData}
            subTitle="Write your answer here!"
            onValueChange={(value) => {
              handleChange({ answer_data: value });
              setIsDisabled(false);
            }}
            onError={() => setIsDisabled(true)}
          />
          <Stack spacing={0}>
            <AccordionBoard
              title="Start Board"
              board={questionData.board?.start}
            />
            <AccordionBoard
              title="Goal Board"
              board={questionData.board?.goal}
            />
            <AccordionBoard
              title="General Patterns"
              copyContent={questionData.general}
              showCopy
            >
              <CodeEditor readOnly defaultValue={questionData.general} />
            </AccordionBoard>
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
    minWidth: "90%",
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

  const question = instance.question || {};

  const questionData = JSON.parse(question?.question_data || "{}");
  const startBoard = questionData.board?.start;
  const goalBoard = questionData.board?.goal;
  // const answerBoard = JSON.parse(answer?.score_data || "{}").answer_board || [
  //   [],
  // ];

  const _getScoreData = () => {
    if (!answer?.score_data) {
      return null;
    }
    const scoreData = JSON.parse(answer.score_data);
    const startTime = new Date(question.start_time);
    const submitTime = new Date(answer.updatedAt);
    scoreData.start_time = startTime;
    scoreData.submit_time = submitTime;
    scoreData.duration = submitTime - startTime;
    delete scoreData.answer_board;

    return JSON.stringify(scoreData);
  };

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        <Stack direction={"row"} spacing={2} justifyContent={"space-between"}>
          <Typography variant="h5" color={"blue"} fontSize={"22px"}>
            {answer?.team?.name}
          </Typography>
          <FormControl variant="standard" sx={{ m: 1, width: 120 }}>
            <Select
              defaultValue={0}
              onChange={(e) => setAnswer(answers[e.target.value])}
            >
              {answers.map((asw, idx) => {
                return (
                  <MenuItem key={idx} value={idx}>
                    {asw.team?.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Stack>
      </DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <Stack spacing={3}>
          <ScoreData score={answer?.score_data} onlyFinal />
          <CodeEditor
            title={title}
            defaultValue={_getScoreData()}
            readOnly={disabled}
            key={answer?.id}
          />
          <Stack spacing={0}>
            <AccordionBoard title="Answer Board">
              <AnswerBoard
                answerId={answer?.id}
                startBoard={startBoard}
                goalBoard={goalBoard}
              />
            </AccordionBoard>
            <AccordionBoard title="Start Board" board={startBoard} />
            <AccordionBoard title="Goal Board" board={goalBoard} />
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
