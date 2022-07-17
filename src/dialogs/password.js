import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { useIntl } from "react-intl";
const PasswordDialog = ({ open, instance, close, save, handleChange }) => {
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog open={open} onClose={close}>
      <DialogTitle>Edit Admin Role</DialogTitle>
      <form>
        <DialogContent>
          <DialogContentText>{(instance || {}).name}</DialogContentText>
          <TextField
            margin="dense"
            label={tr({ id: "Password" })}
            type="password"
            fullWidth
            variant="standard"
            name="password"
            value={(instance || {}).password}
            onChange={(evt) => {
              handleChange({ password: evt.target.value });
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

export default PasswordDialog;
