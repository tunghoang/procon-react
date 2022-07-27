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
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { useContext } from "react";
import Context from "../context";

const useStyles = makeStyles({
  root: {
    overflow: "visible",
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
        match_round_id: round.id,
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
      <form>
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
