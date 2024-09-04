import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";

const useStyles = makeStyles({
  root: {
    // overflow: "visible",
  },
});
const TeamDialog = ({ open, instance, close, save, handleChange, type }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {(instance || {}).id ? "Edit Team" : "Create Team"}
      </DialogTitle>
      <form>
        <DialogContent className={classes.root}>
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
            label="Account"
            type="text"
            fullWidth
            variant="standard"
            disabled={!!(instance || {}).id}
            name="account"
            value={(instance || {}).account}
            onChange={(evt) => {
              handleChange({ account: evt.target.value });
            }}
          />
          <FormControl
            variant="standard"
            sx={{ m: 0, minWidth: 120 }}
            fullWidth
          >
            <InputLabel id="role">Role</InputLabel>
            <Select
              labelId="role"
              label="Role"
              type="text"
              name="is_admin"
              value={(instance || {}).is_admin}
              onChange={(evt) => {
                handleChange({ is_admin: evt.target.value });
              }}
            >
              <MenuItem value={false}>User</MenuItem>
              <MenuItem value={true}>Admin</MenuItem>
            </Select>
          </FormControl>
          {/* <TextField margin="dense" label="Username" type="text" fullWidth variant="standard" disabled={!!(instance || {}).id}
            name="username" value={(instance || {}).username} onChange={(evt) => { handleChange({ username: evt.target.value }) }} />
          <TextField margin="dense" label="Email" type="email" fullWidth variant="standard" disabled={!!(instance || {}).id}
            name="email" value={(instance || {}).email} onChange={(evt) => { handleChange({ email: evt.target.value }) }} />
          <TextField margin="dense" label="Full name" type="text" fullWidth variant="standard"
            name="name" value={(instance || {}).full_name} onChange={(evt) => { handleChange({ full_name: evt.target.value }) }} />
          <TextField margin="dense" label="Date of birth" type="text" fullWidth variant="standard" readOnly
            name="date_of_birth" value={(instance || {}).date_of_birth} onClick={() => setIsOpen(!isOpen)} />
          <TextField margin="dense" label="Address" type="text" fullWidth variant="standard"
            name="address" value={(instance || {}).address} onChange={(evt) => { handleChange({ address: evt.target.value }) }} />
          <TextField margin="dense" label="Phone" type="text" fullWidth variant="standard"
            name="Phone" value={(instance || {}).phone} onChange={(evt) => { handleChange({ phone: evt.target.value }) }} /> */}
          {!(instance || {}).id && (
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="standard"
              name="Password"
              autoComplete="on"
              value={instance.password}
              onChange={(evt) => {
                handleChange({ password: evt.target.value });
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
          <Button onClick={save}>{tr({ id: "Save" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TeamDialog;
