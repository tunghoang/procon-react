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
  Typography,
  IconButton,
  Autocomplete,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
const useStyles = makeStyles({
  root: {
    // overflow: "visible",
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

const TeamMatchDialog = ({ open, teams, close, handleDelete }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{tr({ id: "Teams" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <Stack spacing={1} width={300}>
            {teams?.map((item, idx) => {
              return (
                <Stack
                  key={item.id}
                  direction={"row"}
                  alignItems="center"
                  justifyContent={"space-between"}
                >
                  <Typography>
                    {idx + 1}. {item.name}
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(item.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              );
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

const AddTeamMatchDialog = ({ open, close, handleAdd }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const { data: teams } = useFetchData({ path: "/team", name: "Team" });
  const [teamId, setTeamId] = useState(null);
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{tr({ id: "Add Team" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root} sx={{ width: 300 }}>
          <Autocomplete
            options={teams}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Team"} variant="standard" />
            )}
            onChange={(evt, v) => {
              setTeamId(v.id);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
          <Button onClick={() => handleAdd(teamId)}>
            {tr({ id: "Save" })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export { MatchDialog, AddTeamMatchDialog, TeamMatchDialog };
