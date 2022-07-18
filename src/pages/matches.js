import { IconButton, Paper, Stack, Typography } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useEffect, useState } from "react";
import { useApi } from "../api";
import Context from "../context";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import {
  AddTeamMatchDialog,
  MatchDialog,
  TeamMatchDialog,
} from "../dialogs/match";
import VisibilityIcon from "@mui/icons-material/Visibility";

const Matches = () => {
  const { formatMessage: tr } = useIntl();
  const [matches, setMatches] = useState([]);
  const { round } = useContext(Context);
  const [matchTeams, setMatchTeams] = useState({});
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const { apiGetAll, useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/match",
    "Match"
  );
  const apiDeleteMatch = useConfirmDelete();
  const doInit = () => {
    (async () => {
      const results = await apiGetAll(round.id);
      if (results) setMatches(results);
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
      field: "description",
      headerName: "Description",
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "is_active",
      type: "boolean",
      headerName: "Active",
      flex: 1,
      headerClassName: "tableHeader",
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
    const result = await apiDeleteMatch(selectedMatchIds[0]);
    if (result) doInit();
  };
  const saveInstance = async () => {
    let result;
    if (currentMatch.id) {
      result = await apiEdit(currentMatch.id, currentMatch);
    } else {
      currentMatch.round_id = round.id;
      result = await apiCreate(currentMatch);
    }
    if (result) doInit();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    setCurrentMatch({ ...currentMatch, ...changes });
  };

  useEffect(doInit, [round.id]);

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
          rows={matches}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedMatchIds(ids);
          }}
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
        instance={currentMatch}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      <TeamMatchDialog
        open={dialogName === "TeamMatchDialog"}
        teams={matchTeams.teams}
        matchId={matchTeams.id}
        close={closeDialog}
        init={doInit}
      />
    </>
  );
};
Matches.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Matches.wName = "Matches";

export default Matches;
