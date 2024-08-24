import {
  Badge,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState } from "react";
import { useApi, useFetchData } from "../api";
import Context from "../context";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import {
  AddTeamMatchDialog,
  MatchDialog,
  TeamMatchDialog,
} from "../dialogs/match";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { apiDeleteTeamMatch, apiNewTeamMatch } from "../api/match";

const Matches = () => {
  const { formatMessage: tr } = useIntl();
  const { round } = useContext(Context);
  const [matchTeams, setMatchTeams] = useState({});
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const { useConfirmDelete, apiCreate, apiEdit } = useApi("/match", "Match");
  const apiDeleteMatch = useConfirmDelete();
  const {
    data: matches,
    refetch,
    loading,
  } = useFetchData({
    path: "/match",
    name: "Match",
    config: {
      params: {
        eq_round_id: round?.id,
      },
    },
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
      key: "match_is_active",
      label: "Status",
      type: "boolean",
      options: [
        {
          label: "Active",
          value: 1,
        },
        {
          label: "Inactive",
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
      field: "description",
      headerName: "Description",
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "is_active",
      headerName: "Active",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <>
            {row.is_active ? (
              <Chip label="Active" color="success" />
            ) : (
              <Chip label="Inactive" />
            )}
          </>
        );
      },
    },
    {
      field: "teams",
      headerName: "Teams",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <Stack direction={"row"} spacing={2} alignItems="center">
            <Typography>
              {row.teams.length} {tr({ id: "Teams" })}
            </Typography>
            <IconButton
              disabled={!row.teams.length}
              onClick={() => {
                setMatchTeams({
                  id: row.id,
                  teams: row.teams,
                });
                setDialogName("TeamMatchDialog");
              }}
            >
              <VisibilityIcon />
            </IconButton>
          </Stack>
        );
      },
    },
  ];
  const [dialogName, setDialogName] = useState("");
  const [currentMatch, setCurrentMatch] = useState({});

  const clickNew = () => {
    setCurrentMatch({
      name: "",
      description: "",
      is_active: false,
      team_id: "",
    });
    setDialogName("MatchDialog");
  };
  const openDialog = (name) => {
    const selectedMatch = matches.find((c) => c.id === selectedMatchIds[0]);
    setCurrentMatch(selectedMatch);
    setDialogName(name);
  };
  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteMatch(selectedMatchIds);
    if (result.length) refetch();
  };

  const saveInstance = async () => {
    let result;
    if (currentMatch.id) {
      result = await apiEdit(currentMatch.id, currentMatch);
    } else {
      currentMatch.round_id = round.id;
      result = await apiCreate(currentMatch);
    }
    if (result) refetch();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    setCurrentMatch({ ...currentMatch, ...changes });
  };

  const handleTeam = async (teamId, action) => {
    let result;
    if (action === "delete") {
      result = await apiDeleteTeamMatch(matchTeams.id, teamId);
    } else if (action === "add") {
      result = await apiNewTeamMatch(currentMatch.id, teamId);
    }
    if (result) refetch();
    setDialogName("");
  };

  return (
    <>
      <PageToolbar
        title={tr({ id: "Matches" })}
        showNew={true}
        showEdit={(selectedMatchIds || []).length === 1}
        showDelete={(selectedMatchIds || []).length}
        handleNew={clickNew}
        editBtns={[
          {
            label: "Edit",
            fn: () => openDialog("MatchDialog"),
          },
          {
            label: "Add Team",
            fn: () => openDialog("AddTeamMatchDialog"),
          },
        ]}
        handleDelete={clickDelete}
      />
      <Paper
        component="main"
        sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}
      >
        <DataTable
          filterOptions={filterOptions}
          onFilter={(params) => refetch(params)}
          rows={matches}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedMatchIds(ids);
          }}
          loading={loading}
        />
      </Paper>
      <MatchDialog
        open={dialogName === "MatchDialog"}
        instance={currentMatch}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      <AddTeamMatchDialog
        open={dialogName === "AddTeamMatchDialog"}
        close={closeDialog}
        handleAdd={(teamId) => handleTeam(teamId, "add")}
      />
      <TeamMatchDialog
        open={dialogName === "TeamMatchDialog"}
        teams={matchTeams.teams}
        close={closeDialog}
        handleDelete={(teamId) => handleTeam(teamId, "delete")}
      />
    </>
  );
};
Matches.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Matches.wName = "Matches";

export default Matches;
