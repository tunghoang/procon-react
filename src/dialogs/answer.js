import { DateTimePicker } from "@mui/x-date-pickers";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";

const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const AnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {(instance || {}).id ? "Edit Answer" : "Create Answer"}
      </DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <Stack spacing={3} width={500}>
            <DateTimePicker
              renderInput={(props) => (
                <TextField variant="standard" {...props} />
              )}
              label="Start time"
              value={instance?.start_time || null}
              onChange={(newValue) => {
                handleChange({ start_time: newValue });
              }}
            />
            <DateTimePicker
              renderInput={(props) => (
                <TextField variant="standard" {...props} />
              )}
              label="End time"
              value={instance?.end_time || null}
              onChange={(newValue) => {
                handleChange({ end_time: newValue });
              }}
            />
            <TextField
              margin="dense"
              label="Question ID"
              type="number"
              fullWidth
              variant="standard"
              name="question"
              value={instance?.question_id}
              onChange={(evt) => {
                handleChange({ question_id: evt.target.value });
              }}
            />
            <TextField
              margin="dense"
              label="Team ID"
              type="number"
              fullWidth
              variant="standard"
              name="team"
              value={instance?.team_id}
              onChange={(evt) => {
                handleChange({ team_id: evt.target.value });
              }}
            />
            <TextField
              margin="dense"
              label="Answer Data"
              type="number"
              fullWidth
              variant="standard"
              name="answer"
              value={instance?.answer_data}
              onChange={(evt) => {
                handleChange({ answer_data: evt.target.value });
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
          <Button onClick={save}>{tr({ id: "Save" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AnswerDialog;
