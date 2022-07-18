import { Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useEffect, useState } from "react";
import {
  useConfirmDeleteTeam,
  apiGetTeams,
  apiNewTeam,
  apiEditTeam,
} from "../api";
import TeamDialog from "../dialogs/team";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import TeamPasswordDialog from "../dialogs/password";

const Teams = () => {
  const { formatMessage: tr } = useIntl();
  const [teams, setTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const apiDeleteTeam = useConfirmDeleteTeam();
  const doInit = () => {
    (async () => {
      let results = await apiGetTeams();
      if (results) setTeams(results);
    })();
  };
  const columns = [
    {
      field: "id",
      headerName: "Id",
      width: 100,
      headerClassName: "tableHeader",
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "account",
      headerName: "Account",
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "is_admin",
      headerName: "Role",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: (params) => {
        return params.row.is_admin ? "Admin" : "User";
      },
    },
    // {
    //   field: 'email', headerName: 'Email', flex: 1, headerClassName: 'tableHeader',
    //   valueGetter: (params) => (params.row.username + "@domain.com")
    // }
  ];
  const [dialogName, setDialogName] = useState("");
  const [currentTeam, setCurrentTeam] = useState({});

  const clickNew = () => {
    // setCurrentTeam({ username: "", fullName: "", date_of_birth: "2000/01/01" });
    setCurrentTeam({ name: "", account: "", is_admin: false });
    setDialogName("TeamDialog");
  };
  const openDialog = (name) => {
    let selectedTeam = teams.find((c) => c.id === selectedTeamIds[0]);
    // selectedTeam.date_of_birth = "2020/01/01";
    setCurrentTeam(selectedTeam);
    setDialogName(name);
  };
  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    let result = await apiDeleteTeam(selectedTeamIds[0]);
    if (result) doInit();
  };
  const saveInstance = async () => {
    let result;
    if (currentTeam.id) {
      result = await apiEditTeam(currentTeam.id, currentTeam);
      console.log(result);
    } else {
      // currentTeam.tournament_id = idTournament;
      result = await apiNewTeam(currentTeam);
      console.log(result);
    }
    if (result) doInit();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    let newInst = { ...currentTeam, ...changes };
    setCurrentTeam(newInst);
  };

  useEffect(doInit, []);
  return (
    <>
      <PageToolbar
        title={tr({ id: "Teams" })}
        showNew={true}
        showEdit={(selectedTeamIds || []).length === 1}
        showDelete={(selectedTeamIds || []).length}
        handleNew={clickNew}
        editBtns={[
          {
            label: "Edit",
            fn: () => openDialog("TeamDialog"),
          },
          {
            label: "Change Password",
            fn: () => openDialog("TeamPasswordDialog"),
          },
        ]}
        handleDelete={clickDelete}
      />
      <Paper
        component="main"
        sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}
      >
        <DataTable
          rows={teams}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedTeamIds(ids);
          }}
        />
      </Paper>
      <TeamDialog
        open={dialogName === "TeamDialog"}
        instance={currentTeam}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      <TeamPasswordDialog
        open={dialogName === "TeamPasswordDialog"}
        instance={currentTeam}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
    </>
  );
};
Teams.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Teams.wName = "Teams";

export default Teams;
