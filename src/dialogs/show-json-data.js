import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import JSONPretty from "react-json-pretty";
const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const ShowJsonDataDialog = ({ open, instance, close }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>Data</DialogTitle>
      <form>
        <DialogContent className={classes.root} style={{ minWidth: 500 }}>
          <JSONPretty id="json-pretty" data={instance}></JSONPretty>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{tr({ id: "Close" })}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ShowJsonDataDialog;
