import { Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useState } from "react";
import { useApi, useFetchData } from "../api";
import TeamDialog from "../dialogs/team";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import TeamPasswordDialog from "../dialogs/password";

const Teams = () => {
  const { formatMessage: tr } = useIntl();
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const { apiCreate, apiEdit, useConfirmDelete } = useApi("/team", "Team");
  const apiDeleteTeam = useConfirmDelete();
  const {
    data: teams,
    refetch,
    loading,
  } = useFetchData({
    path: "/team",
    name: "Team",
  });

  const filterOptions = [
    {
      key: "match_id",
      label: "ID",
      type: "text",
    },
    {
      key: "match_name",
      label: "Name",
      type: "text",
    },
    {
      key: "match_account",
      label: "Account",
      type: "text",
    },
    {
      key: "match_is_admin",
      label: "Role",
      type: "boolean",
      options: [
        {
          label: "Admin",
          value: 1,
        },
        {
          label: "User",
          value: 0,
        },
      ],
    },
  ];

  const columns = [
    {
      field: "id",
      headerName: "ID",
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
  ];
  const [dialogName, setDialogName] = useState("");
  const [currentTeam, setCurrentTeam] = useState({});

  const clickNew = () => {
    setCurrentTeam({ name: "", account: "", is_admin: false });
    setDialogName("TeamDialog");
  };
  const openDialog = (name) => {
    const selectedTeam = teams.find((c) => c.id === selectedTeamIds[0]);
    if (name === "TeamPasswordDialog") selectedTeam.password = "";
    else delete selectedTeam.password;
    setCurrentTeam(selectedTeam);
    setDialogName(name);
  };
  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteTeam(selectedTeamIds);
    if (result.length) refetch();
  };
  const saveInstance = async () => {
    let result;
    if (currentTeam.id) {
      result = await apiEdit(currentTeam.id, currentTeam);
    } else {
      result = await apiCreate(currentTeam);
    }
    if (result) refetch();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    setCurrentTeam({ ...currentTeam, ...changes });
  };

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
          filterOptions={filterOptions}
          onFilter={(params) => refetch(params)}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedTeamIds(ids);
          }}
          loading={loading}
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
