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
import CodeEditor from "../components/code-editor";
import GameBoard from "../components/procon24/game-board";
import AccordionBoard from "../components/procon24/accordion-board";

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
          {/* <DateTimePicker
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
          /> */}
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
          {!instance?.id && (
            <CodeEditor
              title="Question Data"
              subTitle={"mode= 0: random; 1: special"}
              readOnly={!!instance?.id}
              defaultValue={{
                width: 32,
                height: 32,
                p: 2,
                mode: 0,
                ndie: 1,
                niter: 2,
              }}
              onValueChange={(value) => handleChange(value)}
            />
          )}
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
  instance,
  close,
  title = "Question Data",
  disabled = false,
}) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();

  const questionData = JSON.parse(instance || "{}");
  const startBoard = questionData.board?.start;
  const goalBoard = questionData.board?.goal;

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
            defaultValue={{
              board: {
                width: questionData.board?.width,
                height: questionData.board?.height,
              },
              general: questionData.general,
            }}
            readOnly={disabled}
          />
          <Stack spacing={0}>
            <AccordionBoard title="Start Board">
              <GameBoard board={startBoard} goal={goalBoard} />
            </AccordionBoard>
            <AccordionBoard title="Goal Board">
              <GameBoard board={goalBoard} goal={goalBoard} />
            </AccordionBoard>
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
