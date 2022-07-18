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
  Select,
  MenuItem,
  Typography,
  IconButton,
  InputLabel,
  FormControl,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { useIntl } from "react-intl";
import { useApi } from "../api";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiDeleteTeamMatch, useConfirmDeleteTeamMatch } from "../api/match";
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

const TeamMatchDialog = ({ open, teams, matchId, close, init }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const apiDeleteDialog = useConfirmDeleteTeamMatch();

  const removeTeamMatch = async (teamId) => {
    const result = await apiDeleteDialog(matchId, teamId);
    console.log(result);
    if (result) init();
  };
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
                    onClick={() => removeTeamMatch(item.id)}
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

const AddTeamMatchDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const [teams, setTeams] = useState([]);
  const { apiGetAll } = useApi("/team", "Teams");

  const doInit = () => {
    (async () => {
      const results = await apiGetAll();
      if (results) setTeams(results);
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
      <DialogTitle>{tr({ id: "Add Team" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root}>
          <FormControl variant="standard" sx={{ m: 1, width: 300 }}>
            <InputLabel>Team</InputLabel>
            <Select
              fullWidth
              variant="standard"
              value={instance?.team_id || ""}
              onChange={(evt) => {
                handleChange({ team_id: evt.target.value });
              }}
              label="Teams"
            >
              <MenuItem value={""}>
                <em style={{ opacity: 0.5 }}>None</em>
              </MenuItem>
              {teams.map((team) => {
                return (
                  <MenuItem value={team.id} key={team.id}>
                    {team.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
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
