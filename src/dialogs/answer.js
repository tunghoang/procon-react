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
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useContext, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { SERVICE_API } from "../api/commons";
import { useFetchData } from "../api/useFetchData";
import AuthAudio from "../components/auth-audio";
import CodeEditor from "../components/code-editor";
import Context from "../context";

const useStyles = makeStyles({
  root: {
    overflow: "visible",
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
  const answerData = instance.answer_data || [];

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
              (item) => item.match.round_id === round.id
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
                  card number:{" "}
                  {JSON.parse(option.question_data || "{}").n_cards}
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

const ScoreDataDialog = ({
  open,
  answerId,
  questionId,
  instance,
  close,
  title = "Score Data",
  disabled = false,
}) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle></DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <Stack spacing={3}>
          <CodeEditor
            title={title}
            defaultValue={instance}
            readOnly={disabled}
          />
          <Stack spacing={1}>
            <Typography ml={1} variant="h6">
              Problem Audio
            </Typography>
            <AuthAudio
              src={`${SERVICE_API}/question/${questionId}/audio/problem-data`}
              type="audio/wav"
              controls
            />
          </Stack>
          <Stack spacing={1}>
            <Typography ml={1} variant="h6">
              Team Audio
            </Typography>
            <AuthAudio
              src={`${SERVICE_API}/answer/${answerId}/audio`}
              type="audio/wav"
              controls
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Close" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

export { AnswerDialog, ScoreDataDialog };
