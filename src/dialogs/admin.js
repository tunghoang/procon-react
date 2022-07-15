import { Box, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useIntl } from 'react-intl';
import { useState } from 'react';
const useStyles = makeStyles({
  root: {
    overflow: 'visible'
  }
});
const AdminDialog = ({open, instance, close, save, handleChange}) => {
  const [isOpen, setIsOpen] = useState(false);
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const styles = theme => ({ root: { overflow: 'visible' } });
  return (
  <Dialog classes={{ paperScrollPaper: classes.root }} open={open} onClose={close}>
    <DialogTitle>{(instance||{}).id?"Edit Admin": "Create Admin"}</DialogTitle>
    <form>
      <DialogContent className={classes.root} >
        <DialogContentText>
        {(instance||{}).full_name} -- {(instance || {}).date_of_birth } -- {(instance || {}).id}
        </DialogContentText>
          <input type="hidden" name="idAdmin" value={(instance || {}).id} />
          <TextField margin="dense" label="Email" type="text" fullWidth variant="standard" disabled={(instance || {}).id}
            name="username" value={(instance || {}).username} onChange={ (evt) => { handleChange({username: evt.target.value})}}/>
          <TextField margin="dense" label="Email" type="email" fullWidth variant="standard" 
            name="email" value={(instance || {}).email} onChange={ (evt) => { handleChange({email:evt.target.value})}}/>
          <TextField margin="dense" label="Full name" type="text" fullWidth variant="standard" 
            name="name" value={(instance || {}).full_name} onChange={ (evt) => { handleChange({full_name:evt.target.value})}}/>
          <TextField margin="dense" label="Date of birth" type="text" fullWidth variant="standard" readonly
            name="date_of_birth" value={(instance || {}).date_of_birth} onClick={() => setIsOpen(!isOpen) }/>
            {isOpen && <div style={{ position: 'absolute', zIndex: 2 }} >
              <DatePicker inline showMonthYearDropdown onChange={(date) => {
                  handleChange({date_of_birth: date.toLocaleDateString()});
                  setIsOpen(false);
                }} selected={new Date((instance || {}).date_of_birth)} 
                showYearDropdown
                dateFormatCalendar="MMMM"
                yearDropdownItemNumber={25}
                scrollableYearDropdown /></div>}

      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({id: "Cancel"})}</Button>
        <Button onClick={save}>{tr({id: "Save"})}</Button>
      </DialogActions>
    </form>
  </Dialog> 
  )
}

export default AdminDialog;
