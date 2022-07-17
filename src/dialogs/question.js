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
const QuestionDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit Question" : "Create Question"}
      </DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <Stack spacing={3} width={500}>
            <DateTimePicker
              label="Start time"
              value={instance?.start_time || null}
              onChange={(newValue) => {
                handleChange({ start_time: newValue });
              }}
              renderInput={(props) => (
                <TextField variant="standard" {...props} />
              )}
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
            <TextField
              margin="dense"
              label="Match ID"
              type="number"
              fullWidth
              variant="standard"
              disabled={!!instance?.id}
              name="account"
              value={instance?.match_id}
              onChange={(evt) => {
                handleChange({ match_id: evt.target.value });
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

export default QuestionDialog;
