import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Stack,
  Switch,
  FormControlLabel,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import "react-datepicker/dist/react-datepicker.css";
import { useIntl } from "react-intl";
const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const MatchDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {(instance || {}).id ? "Edit Match" : "Create Match"}
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
              value={(instance || {}).name}
              onChange={(evt) => {
                handleChange({ name: evt.target.value });
              }}
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              variant="standard"
              name="account"
              value={(instance || {}).description}
              onChange={(evt) => {
                handleChange({ description: evt.target.value });
              }}
            />
            <FormControlLabel
              sx={{ flexDirection: "row" }}
              control={
                <Switch
                  checked={instance?.is_active}
                  onChange={(evt) => {
                    handleChange({ is_active: evt.target.checked });
                  }}
                />
              }
              label="Active"
              labelPlacement="start"
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

const TeamMatchDialog = ({ open, instance, close }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
      fullWidth
    >
      <DialogTitle>{tr({ id: "Teams" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <Stack spacing={2}>
            {instance.map((item) => {
              <div key={item.id}>{item.name}</div>;
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Close" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const AddTeamMatchDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle></DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <TextField
            margin="dense"
            label="Teams"
            type="text"
            fullWidth
            variant="standard"
            name="teams"
            value={instance?.team_id}
            onChange={(evt) => {
              handleChange({ team_id: evt.target.value });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
          <Button onClick={save}>{tr({ id: "Save" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export { MatchDialog, AddTeamMatchDialog, TeamMatchDialog };
