import { DateTimePicker } from "@mui/x-date-pickers";
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
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { useContext } from "react";
import Context from "../context";
import CodeEditor from "../components/code-editor";
import { SERVICE_API } from "../api/commons";
import AudioAuth from "../components/audio-auth";

const useStyles = makeStyles({
  root: {
    // overflow: "visible",
  },
});
const QuestionDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { round } = useContext(Context);
  const { formatMessage: tr } = useIntl();
  const { data: matches } = useFetchData({
    path: "/match",
    config: {
      params: {
        eq_round_id: round?.id,
      },
    },
  });

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit Question" : "Create Question"}
      </DialogTitle>
      <DialogContent className={classes.root}>
        <Stack spacing={3} width={500}>
          <TextField
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="standard"
            name="name"
            value={instance?.name}
            onChange={(evt) => {
              handleChange({ name: evt.target.value });
            }}
          />
          <DateTimePicker
            label="Start time"
            value={instance?.start_time || null}
            onChange={(newValue) => {
              handleChange({ start_time: newValue });
            }}
            renderInput={(props) => <TextField variant="standard" {...props} />}
          />
          <DateTimePicker
            label="End time"
            value={instance?.end_time || null}
            onChange={(newValue) => {
              handleChange({ end_time: newValue });
            }}
            renderInput={(props) => (
              <TextField variant="standard" error={false} {...props} />
            )}
          />
          <Autocomplete
            options={matches}
            value={
              matches.find((item) => item.id === instance.match_id) || null
            }
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Match"} variant="standard" />
            )}
            onChange={(evt, v) => handleChange({ match_id: v?.id })}
          />
          <CodeEditor
            title="Question Dataaaa"
            defaultValue={{
              n_cards: instance.n_cards,
              n_parts: instance.n_parts,
              bonus_factor: instance.bonus_factor,
              penalty_per_change: instance.penalty_per_change,
              point_per_correct: instance.point_per_correct
            }}
            onValueChange={(value) => handleChange({ 
              n_cards: value.n_cards,
              n_parts: value.n_parts,
              bonus_factor: value.bonus_factor,
              penalty_per_change: value.penalty_per_change,
              point_per_correct: value.point_per_correct
            })}
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

const QuestionDataDialog = ({
  open,
  questionId,
  instance,
  close,
  title = "Question Data",
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
            <AudioAuth
              src={`${SERVICE_API}/question/${questionId}/audio/problem-data`}
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

export { QuestionDialog, QuestionDataDialog };
