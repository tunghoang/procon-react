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
        {instance?.id ? "Edit Answer" : "Create Answer"}
      </DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <Stack spacing={3} width={500}>
            <Autocomplete
              options={questions}
              value={
                questions.find((item) => item.id === instance.question_id) ||
                null
              }
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label={"Question"} variant="standard" />
              )}
              onChange={(evt, v) => handleChange({ question_id: v.id })}
            />

            <Autocomplete
              options={teams}
              value={teams.find((item) => item.id === instance.team_id) || null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label={"Team"} variant="standard" />
              )}
              onChange={(evt, v) => handleChange({ team_id: v.id })}
            />
            <DynamicInput
              label={"Answer Data"}
              data={instance?.answer_data}
              inputChange={(value) => {
                handleChange({ answer_data: value });
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
          <Button
            onClick={async () => {
              if (Array.isArray(instance.answer_data)) {
                instance.answer_data = instance.answer_data.reduce(
                  (cur, next) => {
                    return {
                      ...cur,
                      [next.key]:
                        next.nameType === "object"
                          ? next.name
                              .split(",")
                              .filter((item) => item)
                              .map((item) => item.trim())
                          : next.name,
                    };
                  },
                  {}
                );
              } else if (typeof instance.answer_data === "string") {
                instance.answer_data = JSON.parse(instance.answer_data);
              }
              await save();
            }}
          >
            {tr({ id: "Save" })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AnswerDialog;
