import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button} from '@mui/material';
import { useIntl } from 'react-intl';
const TournamentDialog = ({open, tournament, close, save, handleChange}) => {
  const { formatMessage: tr } = useIntl();
  return (
  <Dialog open={open} onClose={close}>
    <DialogTitle>{(tournament||{}).id?"Edit Tournament": "Create Tournament"}</DialogTitle>
    <form>
      <DialogContent>
        <DialogContentText>
        {/* ADD CONTENT HERE IF NECESSARY */}
        </DialogContentText>
        <input type="hidden" name="idTournament" value={(tournament || {}).id} />
        <TextField margin="dense" label="Name" type="text" fullWidth variant="standard" 
          name="name" value={(tournament || {}).name} onChange={ (evt) => { handleChange({name:evt.target.value})}}/>
        <TextField margin="dense" label="Description" type="text" fullWidth variant="standard" 
          name="description" value={(tournament || {}).description} onChange={(evt) => {handleChange({description: evt.target.value})}} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({id: "Cancel"})}</Button>
        <Button onClick={save}>{tr({id: "Save"})}</Button>
      </DialogActions>
    </form>
  </Dialog> 
  )
}

export default TournamentDialog;
