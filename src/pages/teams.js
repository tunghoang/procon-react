import { Box, Container, Paper } from '@mui/material';
import { DashboardLayout } from '../components/dashboard-layout';
import { useIntl } from 'react-intl';
import { useContext, useEffect, useState } from 'react';
import { useConfirmDeleteTeam, apiGetTeams, apiNewTeam, apiEditTeam } from '../api';
import Context from '../context';
import TeamDialog from '../dialogs/team';
import PageToolbar from '../components/page-toolbar';
import DataTable from '../components/data-table';
import TeamPasswordDialog from '../dialogs/password';

const Teams = () => {
  const { formatMessage: tr } = useIntl();
  const [teams, setTeams] = useState([]);
  const { idTournament, tournamentName } = useContext(Context);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const apiDeleteTeam = useConfirmDeleteTeam();
  const doInit = () => {
    (async () => {
      let results = await apiGetTeams(idTournament);
      if (results) setTeams(results);
    })();
  }
  const columns = [{
    field: 'id', headerName: 'Id', width: 100, headerClassName: 'tableHeader'
  }, {
    field: 'username', headerName: 'Username', width: 150, headerClassName: 'tableHeader',
  }, {
    field: 'fullName', headerName: 'Name', flex: 1, headerClassName: 'tableHeader'
  }, {
    field: 'email', headerName: 'Email', flex: 1, headerClassName: 'tableHeader',
    valueGetter: (params) => (params.row.username + "@domain.com")
  }]
  const [dialogName, setDialogName] = useState("");
  const [currentTeam, setCurrentTeam] = useState({});

  const clickNew = () => {
    setCurrentTeam({ username: "", fullName: '', date_of_birth: '2000/01/01' });
    setDialogName("TeamDialog");
  }
  const openDialog = (name) => {
    let selectedTeam = teams.find(c => c.id === selectedTeamIds[0]);
    selectedTeam.date_of_birth = "2020/01/01";
    setCurrentTeam(selectedTeam);
    setDialogName(name);
  }
  const closeDialog = () => {
    setDialogName("");
  }
  const clickDelete = async () => {
    let result = await apiDeleteTeam(selectedTeamIds[0]);
    console.log(result);
    if (result) doInit();
  }
  const saveInstance = async () => {
    console.log('Save instance');
    let result;
    if (currentTeam.id) {
      result = await apiEditTeam(currentTeam.id, currentTeam);
      console.log(result);
    }
    else {
      currentTeam.tournament_id = idTournament;
      result = await apiNewTeam(currentTeam);
      console.log(result);
    }
    if (result) doInit();
    setDialogName("");
  }
  const changeInstance = (changes) => {
    let newInst = { ...currentTeam, ...changes };
    setCurrentTeam(newInst);
  }

  const updateTeamSubject = async (subjects) => {
    console.log('Update team subject ', subjects, currentTeam.id);
    await apiEditTeam(currentTeam.id, { subject_ids: subjects.map(s => s.id) });
    setDialogName("");
    doInit();
  }

  const doCheckExistedSubject = () => {
    const currentTeam = teams.find(c => c.id === selectedTeamIds[0]);
    if (!currentTeam) return subjects;
    const team_subjects_ids = currentTeam.subjects.map(s => s.id);
    if (!team_subjects_ids) return subjects;
    const rs =  subjects.map(subject => {
      if (team_subjects_ids.includes(subject.id)) return { ...subject, selected: true };
      return { ...subject, selected: false };
    })
    return rs
  }
  useEffect(doInit, [idTournament]);
  return (<>
    <PageToolbar title={tr({ id: "Teams" })} showNew={true}
      showEdit={(selectedTeamIds || []).length === 1} showDelete={(selectedTeamIds || []).length}
      handleNew={clickNew}
      editBtns={[{
        label: 'Edit', fn: () => openDialog('TeamDialog')
      },
      // { 
      //   label: 'Edit Role', fn: () => openDialog('TeamClassDialog') 
      // },
      {
        label: 'Change Password', fn: () => openDialog('TeamPasswordDialog')
      }]}
      handleDelete={clickDelete}
      showSelect={(selectedTeamIds || null).length === 1}
      handleSelect={() => openDialog("SelectDialog")}
      selectTitle="Teaching Subjects"
    />
    <Paper component="main"
      sx={{ height: 'calc(100vh - 64px - 48px)', pt: 0, pb: 4, px: 2 }} >
      <DataTable
        rows={teams} columns={columns}
        onSelectionModelChange={(ids) => {
          setSelectedTeamIds(ids);
        }}
      />
    </Paper>
    <TeamDialog open={dialogName === 'TeamDialog'} instance={currentTeam} close={closeDialog} save={saveInstance}
      handleChange={changeInstance} />
    <TeamPasswordDialog open={dialogName === 'TeamPasswordDialog'} instance={currentTeam} close={closeDialog} save={saveInstance}
      handleChange={changeInstance} />
  </>
  );
}
Teams.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

Teams.wName = "Teams";

export default Teams;
