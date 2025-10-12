import { Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState, useEffect } from "react";
import { useApi, useFetchData } from "../api";
import { api } from "../api/commons";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Context from "../context";
import ScoreData from "../components/procon25/score-data";

const Answers = () => {
  const { formatMessage: tr } = useIntl();
  const [selectedIds, setSelectedIds] = useState([]);
  const [dialogInstance, setDialogInstance] = useState({});
  const [dialogName, setDialogName] = useState("");
  const { round } = useContext(Context);
  const { useConfirmDelete } = useApi("/answer", "Answer");
  const apiDeleteDialog = useConfirmDelete();
  const [filterParams, setFilterParams] = useState({});
  const {
    data: answers,
    refetch,
    loading,
  } = useFetchData({
    path: "/answer",
    name: "Answer",
    config: {
      params: {
        "match[eq_round_id]": round?.id,
      },
    },
    isFetch: false,
  });

  useEffect(() => {
    refetch(filterParams);
  }, [filterParams]);

  const filterOptions = [
    {
      key: "match_id",
      label: "ID",
      type: "text",
    },
    {
      key: "question[match_name]",
      label: "Question name",
      type: "text",
    },
    {
      key: "team[match_name]",
      label: "Team name",
      type: "text",
    },
    {
      key: "match[match_name]",
      label: "Match name",
      type: "text",
    },
    {
      key: "match[match_is_active]",
      label: "Match status",
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

  const getScores = (scoreData) => {
    const scores = JSON.parse(scoreData || "{}");
    return isNaN(scores?.final_score)
      ? Number.NEGATIVE_INFINITY
      : scores.final_score;
  };

  const columns = [
    {
      field: "team",
      headerName: "Team",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: ({ row }) => {
        return row.team?.name;
      },
    },
    {
      field: "question",
      headerName: "Question",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: ({ row }) => {
        return row.question?.name;
      },
    },
    {
      field: "match",
      headerName: "Match",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <Chip
            label={row.match.name}
            color={row.match.is_active ? "success" : "default"}
          />
        );
      },
    },
    {
      field: "score",
      headerName: "Score Data",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <>
            <IconButton
              onClick={async () => {
                const question = await api(
                  `${import.meta.env.VITE_SERVICE_API}/question/${row.question_id}`
                );
                setDialogInstance({
                  answers: [row],
                  question,
                });
                setDialogName("ScoreDataDialog");
              }}
            >
              <VisibilityIcon />
            </IconButton>
            <ScoreData scores={JSON.parse(row.score_data || "{}")} />
          </>
        );
      },
      valueGetter: ({ row }) => getScores(row.score_data),
    },
  ];

  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteDialog(selectedIds);
    if (result.length) await refetch();
  };

  return (
    <>
      <PageToolbar
        title={tr({ id: "Answers" })}
        showDelete={(selectedIds || []).length}
        handleDelete={clickDelete}
      />
      <Paper
        className="Answer"
        component="main"
        sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}
      >
        <DataTable
          rows={answers}
          onRefresh={async () => await refetch(filterParams)}
          filterOptions={filterOptions}
          onFilter={(params) => setFilterParams(params)}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedIds(ids);
          }}
          loading={loading}
          initialState={{
            sorting: {
              sortModel: [{ field: "score", sort: "desc" }],
            },
          }}
        />
      </Paper>
      {dialogName === "ScoreDataDialog" && (
        <ScoreDataDialog
          open={dialogName === "ScoreDataDialog"}
          instance={dialogInstance}
          close={closeDialog}
          disabled
        />
      )}
    </>
  );
};
Answers.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Answers.wName = "Ansers";

export default Answers;
