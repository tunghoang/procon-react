import { useState, useContext, useEffect } from 'react';
import {Box, Container, Typography, Grid, Card, CardContent, Divider, IconButton, Button} from '@mui/material';
import { DashboardLayoutRoot } from '../components/dashboard-layout';
import {DashboardNavbar} from '../components/dashboard-navbar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Context, {useTitle} from '../context';
import TournamentDialog from '../dialogs/tournament';
import { useIntl } from 'react-intl';
import {apiGetTournaments, useConfirmDeleteTournament, apiNewTournament, apiEditTournament} from '../api';
import AddIcon from '@mui/icons-material/Add';
const Tournament = ({idTournament, name, description, handleDelete, handleEdit,...rest}) => {
  const [zDepth, setZDepth] = useState(false);
  const [color, setColor] = useState('#FFFFFF');
  const { updateContext } = useContext(Context);
  const {formatMessage: tr} = useIntl();
  useTitle(null);
  return (
  <>
    <Card raised={zDepth} 
      onMouseOver={() => {
        console.log('mouse over', zDepth);
        setZDepth(true);
        setColor('#f5f4e3');
      }}
      onMouseOut={() => {
        setZDepth(false);
        setColor('#FFFFFF');
      }}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', 'backgroundColor': color }} {...rest} >
      <CardContent sx={{ cursor: 'pointer' }} onClick={() => updateContext({idTournament: idTournament, tournamentName: name})} >
        <Typography align="center" color="textPrimary" gutterBottom variant="h5" >
          {name}
        </Typography>
        <Typography align="center" color="textPrimary" variant="body1" >
          {description}
        </Typography>
      </CardContent>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ justifyContent: 'space-between' }} >
          <Grid item sx={{ alignItems: 'center', display: 'flex' }} >
            <Button onClick={handleEdit}>
              <EditIcon color="action" />
            <Typography color="textSecondary" display="inline" sx={{ pl: 1 }} variant="body2" >
              {tr({id: "Edit"})}
            </Typography>
            </Button>
          </Grid>
          <Grid item sx={{ alignItems: 'center', display: 'flex' }} >
            <Button onClick={handleDelete} >
              <DeleteIcon color="action" />
            <Typography color="textSecondary" display="inline" sx={{ pl: 1 }} variant="body2" >
              {tr({id: "Remove"})}
            </Typography>
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Card>
  </>
  )
}
const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentTournament, setCurrentTournament] = useState(null);
  
  const { formatMessage: tr } = useIntl();
  const doInit = () => {
    apiGetTournaments().then((shs) => {
      if (shs) setTournaments(shs);
    });
  }
  useEffect(doInit, []);
  const apiDeleteTournament = useConfirmDeleteTournament();
  const handleDelete = async (tournament) => {
    console.log('Delete');
    let res = await apiDeleteTournament(tournament.id);
    console.log(res);
    if (res) doInit();
  }
  return ( <>
    <DashboardLayoutRoot style={{paddingLeft:'0px', marginTop: '20px'}}>
      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', width: '100%' }} >
        <Container maxWidth="lg">
          <Box sx={{width: '100%', textAlign: 'right'}} mb={1}>
            <Button onClick={() => {
              setCurrentTournament({name: "", description: ""});
              setShowDialog(true);
            }}><AddIcon />{tr({id: "Create"})}</Button>
          </Box>
          <Grid container spacing={3}>
          {tournaments.map(tournament => (
              <Grid item key={tournament.id} lg={4} md={6} xs={12}>
                <Tournament name={tournament.name} idTournament={tournament.id} description={tournament.description} 
                  handleDelete={() => handleDelete(tournament)} handleEdit={() => {
                    setCurrentTournament(tournament); 
                    setShowDialog(true);
                  }}/>
              </Grid>
          ))}
          </Grid>
        </Container>
      </Box>
    </DashboardLayoutRoot>
    <TournamentDialog open={showDialog} tournament={currentTournament} close={() => setShowDialog(false)} 
      save={ async () => {
        if (currentTournament.id) await apiEditTournament(currentTournament.id, currentTournament);
        else await apiNewTournament(currentTournament);
        setShowDialog(false);
        doInit();
      }} handleChange={(change) => {
        let s = { ...currentTournament, ...change };
        setCurrentTournament(s); 
      }}/>
    <DashboardNavbar sx={{
          left: 0,
          width: {
            lg: '100%'
          }
        }} /> </>
  )
}
export default Tournaments;
