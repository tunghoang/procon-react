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
import SelectData from "../components/select-data";
import { useFetchData } from "../api/useFetchData";
import DynamicInput from "../components/dynamic-input";

const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const AnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();

  const { data: questions } = useFetchData({
    path: "/question",
    name: "Question",
  });
  const { data: teams } = useFetchData({ path: "/team", name: "Team" });

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
            {/* <DateTimePicker
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
            /> */}
            <SelectData
              label={"Question"}
              onChange={(item) => handleChange({ question_id: item.value })}
              data={questions?.map((question) => ({
                key: question.id,
                value: question.name,
              }))}
            />
            <SelectData
              label={"Team"}
              onChange={(item) => handleChange({ team_id: item.value })}
              data={teams?.map((team) => ({ key: team.id, value: team.name }))}
            />
            <DynamicInput
              label={"Answer Data"}
              data={instance?.answer_data}
              inputChange={(value) => {
                console.log(value);
                const answerData = value.reduce((cur, next) => {
                  return {
                    ...cur,
                    [next.key]: next.name,
                  };
                }, {});
                console.log(answerData);
                handleChange({ answer_data: answerData });
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
