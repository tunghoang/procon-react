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
      <DialogTitle>{tr({ id: "Change Password" })}</DialogTitle>
      {/* <form> */}
      <DialogContent sx={{ width: 300 }}>
        <DialogContentText>{instance?.name}</DialogContentText>
        <TextField
          margin="dense"
          label={tr({ id: "Password" })}
          type="password"
          fullWidth
          variant="standard"
          name="password"
          autoComplete="on"
          value={instance.password}
          onChange={(evt) => {
            handleChange({ password: evt.target.value });
          }}
        />
      </DialogContent>
      {/* </form> */}
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button disabled={!instance.password} onClick={save}>
          {tr({ id: "Save" })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordDialog;
