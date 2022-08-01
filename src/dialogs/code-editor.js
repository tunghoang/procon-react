import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import CodeEditor from "../components/code-editor";
const useStyles = makeStyles({
  root: {
    overflow: "visible",
  },
});
const CodeEditorDialog = ({ open, instance, close }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle></DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <CodeEditor title={"Data Editor"} defaultValue={instance} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Close" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeEditorDialog;
