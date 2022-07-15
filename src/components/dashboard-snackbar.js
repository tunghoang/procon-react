import { createContext, useContext, forwardRef } from 'react';
import { Snackbar } from '@mui/material';
import MuiAlert from '@mui/material/Alert';
export const FeedbackContext = createContext({
  toastOpen: false,
  toastMessage: null,
  severity: 'info',
  openToast: (msg, severity) => {},
  closeToast: () => {}
});

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});
const DashboardSnackbar = (props) => {
  const fctx = useContext(FeedbackContext);
  return (
    <Snackbar open={fctx.toastOpen} autoHideDuration={6000} onClose={fctx.closeToast} {...props}> 
      <Alert onClose={() => {
        console.log('TRIGGER');
        fctx.closeToast();
      }} severity={fctx.severity} sx={{ width: '100%' }}>
          ++ {fctx.toastMessage} --
      </Alert>
    </Snackbar>
  )
}

export default DashboardSnackbar;
