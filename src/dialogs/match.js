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
  Autocomplete,
  Checkbox,
  Box,
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
      <DialogTitle>{instance?.id ? "Edit Match" : "Create Match"}</DialogTitle>
      <form>
        <DialogContent className={classes.root} sx={{ width: 500 }}>
          <Stack spacing={3}>
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
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              variant="standard"
              name="account"
              value={instance?.description}
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
  const [selectedTeams, setSelectedTeams] = useState([]);

  const handleSelect = (e, team) => {
    if (e.target.checked) setSelectedTeams([...selectedTeams, team]);
    else {
      const rmIdx = selectedTeams.findIndex((item) => item.id === team.id);
      selectedTeams.splice(rmIdx, 1);
      setSelectedTeams([...selectedTeams]);
    }
  };

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{tr({ id: "Teams" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root} sx={{ width: 500 }}>
          <Stack spacing={1}>
            {teams?.map((item) => {
              return (
                <div key={item.id}>
                  <FormControlLabel
                    control={<Checkbox />}
                    onChange={(e) => handleSelect(e, item)}
                    label={item.name}
                  />
                </div>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          {!!selectedTeams.length && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => handleDelete(selectedTeams)}
            >
              {tr({ id: "Remove" })}
            </Button>
          )}
          <Button onClick={close}>{tr({ id: "Close" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const AddTeamMatchDialog = ({ open, close, teams, handleAdd }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const { data: allTeams } = useFetchData({ path: "/team", name: "Team" });
  const [selectedTeams, setSelectedTeams] = useState([]);

  const filterTeams = allTeams.filter(
    (item) => !teams.find((team) => team.id === item.id)
  );

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{tr({ id: "Add Team" })}</DialogTitle>
      <form>
        <DialogContent className={classes.root} sx={{ width: 500 }}>
          <Autocomplete
            multiple
            options={filterTeams}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box key={key} {...optionProps}>
                  {option.name} {option.added}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Team" variant="standard" />
            )}
            onChange={(_, values) => setSelectedTeams(values)}
          />
        </DialogContent>
      </form>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button
          disabled={!selectedTeams.length}
          onClick={() => handleAdd(selectedTeams)}
        >
          {tr({ id: "Save" })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { MatchDialog, AddTeamMatchDialog, TeamMatchDialog };
