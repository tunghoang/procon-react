import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Stack,
  Autocomplete,
  Typography,
  Box,
  Grid,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useContext, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { api, doGet, doPost } from "../api/commons";
import { useFetchData } from "../api/useFetchData";
import CodeEditor from "../components/code-editor";
import Context from "../context";
import GameBoard from "../components/procon24/game-board";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;

const useStyles = makeStyles({
  root: {
    // overflow: "visible",
  },
});
const AnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const { round } = useContext(Context);
  const { data: questions } = useFetchData({
    path: "/question",
    name: "Question",
  });
  const { data: teams } = useFetchData({ path: "/team", name: "Team" });
  const answerData = instance?.answer_data || [];

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit Answer" : "Create Answer"}
      </DialogTitle>
      <DialogContent className={classes.root}>
        <Stack spacing={3} width={500}>
          <Autocomplete
            options={questions.filter(
              (item) => item.match.round_id === round?.id
            )}
            value={
              questions.find((item) => item.id === instance?.question_id) ||
              null
            }
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <Box {...props}>
                <Typography>{option.name}</Typography>
                <Typography fontSize={"0.9rem"} ml={2} sx={{ opacity: 0.5 }}>
                  {`card number: ${
                    JSON.parse(option.question_data || "{}").n_cards
                  }`}
                </Typography>
              </Box>
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Question"} variant="standard" />
            )}
            onChange={(evt, v) => {
              handleChange({ question_id: v?.id });
            }}
          />
          <Autocomplete
            options={teams}
            value={teams.find((item) => item.id === instance.team_id) || null}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Team"} variant="standard" />
            )}
            onChange={(evt, v) => handleChange({ team_id: v?.id })}
          />
          <CodeEditor
            title="Answer Data"
            defaultValue={answerData}
            onValueChange={(value) => handleChange({ answer_data: value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button onClick={save}>{tr({ id: "Save" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

const UserAnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const [isDisabled, setIsDisabled] = useState(true);
  const answerData = instance?.answer_data || {};
  if (!instance) return null;

  const questionData = JSON.parse(instance?.question?.question_data || "{}");

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit Answer" : "Create Answer"}
      </DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h6">Start Board</Typography>
            <GameBoard board={questionData?.board?.goal} />
            <Typography variant="h6">Goal Board</Typography>
            <GameBoard board={questionData?.board?.start} />
          </Stack>
          <CodeEditor
            title="Answer Data"
            height="180px"
            defaultValue={answerData}
            onValueChange={(value) => {
              handleChange({ answer_data: value });
              setIsDisabled(false);
            }}
            onError={() => setIsDisabled(true)}
          />
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

const ScoreDataDialog = ({
  open,
  instance,
  close,
  title = "Score Data",
  disabled = false,
}) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  if (!instance) return null;

  const goalBoard = JSON.parse(instance.question.question_data).board.goal;
  const answerBoard = JSON.parse(instance.score_data).answer_board;

  const _getScoreData = () => {
    if (!instance.score_data) {
      return instance.score_data;
    }
    const scoreData = JSON.parse(instance.score_data);
    const question = instance.question;
    const startTime = new Date(question.start_time);
    const submitTime = new Date(instance.updatedAt);
    const duration = submitTime - startTime;
    scoreData.duration = duration;
    scoreData.start_time = startTime;
    scoreData.submit_time = submitTime;
    delete scoreData.answer_board;

    return JSON.stringify(scoreData);
  };

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{instance.team?.name}</DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h6">Answer Board</Typography>
            <GameBoard board={answerBoard} goal={goalBoard} type="compare" />
          </Stack>
          <CodeEditor
            title={title}
            defaultValue={_getScoreData()}
            readOnly={disabled}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Close" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

export { AnswerDialog, ScoreDataDialog, UserAnswerDialog };
