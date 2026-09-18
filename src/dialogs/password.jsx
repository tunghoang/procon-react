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

/**
 * Change-password dialog.
 *
 * `requireCurrent` is set when the signed-in account changes its OWN password:
 * `PUT /team/password` now takes `{current_password, password}` and rejects a
 * wrong (or missing) current password, so an unlocked browser can no longer be
 * used to take over the session's account. The admin flow on the Teams page
 * sets someone ELSE's password and keeps the single field.
 */
const PasswordDialog = ({
  open,
  instance,
  close,
  save,
  handleChange,
  requireCurrent = false,
}) => {
  const { formatMessage: tr } = useIntl();
  const canSave =
    !!instance?.password && (!requireCurrent || !!instance?.current_password);
  return (
    <Dialog open={open} onClose={close}>
      <DialogTitle>{tr({ id: "Change Password" })}</DialogTitle>
      <form onSubmit={(e) => e.preventDefault()}>
        <DialogContent sx={{ width: 300 }}>
          <DialogContentText>{instance?.name}</DialogContentText>
          {requireCurrent && (
            <TextField
              margin="dense"
              label={tr({ id: "password.current" })}
              type="password"
              fullWidth
              variant="standard"
              name="current_password"
              autoComplete="current-password"
              value={instance?.current_password || ""}
              onChange={(evt) => {
                handleChange({ current_password: evt.target.value });
              }}
            />
          )}
          <TextField
            margin="dense"
            label={tr({ id: requireCurrent ? "password.new" : "Password" })}
            type="password"
            fullWidth
            variant="standard"
            name="password"
            autoComplete={requireCurrent ? "new-password" : "on"}
            value={instance?.password || ""}
            onChange={(evt) => {
              handleChange({ password: evt.target.value });
            }}
          />
        </DialogContent>
      </form>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button disabled={!canSave} onClick={save}>
          {tr({ id: "Save" })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordDialog;
