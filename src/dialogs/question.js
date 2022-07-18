import { DateTimePicker } from "@mui/x-date-pickers";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useApi } from "../api";
import { useEffect, useState } from "react";

const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const QuestionDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const [matches, setMatches] = useState([]);
  const { apiGetAll } = useApi("/match", "Match");

  const doInit = () => {
    (async () => {
      const results = await apiGetAll();
      if (results) setMatches(results);
    })();
  };

  useEffect(() => {
    doInit();
  }, []);
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
            <FormControl variant="standard" sx={{ m: 1 }}>
              <InputLabel>Match</InputLabel>
              <Select
                fullWidth
                sx={{ width: 500 }}
                variant="standard"
                value={instance?.match_id}
                onChange={(evt) => {
                  handleChange({ match_id: evt.target.value });
                }}
              >
                <MenuItem value="">
                  <em style={{ opacity: 0.5 }}>None</em>
                </MenuItem>
                {matches.map((match) => {
                  return (
                    <MenuItem value={match.id} key={match.id}>
                      {match.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
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
