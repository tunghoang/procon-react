import "./answers.css";
import { Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState, useEffect } from "react";
import { useFetchData } from "../api";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Context from "../context";

const Answers = () => {
  const { formatMessage: tr } = useIntl();
  const [selectedIds, setSelectedIds] = useState([]);
  const [answer, setAnswer] = useState({});
  const { round } = useContext(Context);
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

  const getScores = (answerData) => {
    const scores = JSON.parse(answerData || "{}");
    return isNaN(scores?.final_score)
      ? Number.NEGATIVE_INFINITY
      : scores.final_score;
  };
  const renderScores = (answerData) => {
    const scores = JSON.parse(answerData || "{}");
    return (
      <span className="scores">
        <span className="final-score">
          {!isNaN(scores?.final_score) ? scores.final_score : "NA"}
        </span>
        <span className="raw-score">
          {!isNaN(scores?.raw_score) ? scores?.raw_score : "NA"}
        </span>
        <span className="penalty-score">
          {!isNaN(scores?.penalties) ? scores?.penalties : "NA"}
        </span>
        <span className="max-score">
          {!isNaN(scores?.max_score) ? scores?.max_score : "NA"}
        </span>
      </span>
    );
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
              onClick={() => {
                setAnswer({
                  ...row,
                  question_id: row.question_id,
                });
                setDialogName("ScoreDataDialog");
              }}
            >
              <VisibilityIcon />
            </IconButton>
            <span>{renderScores(row.score_data)}</span>
          </>
        );
      },
      valueGetter: ({ row }) => getScores(row.score_data),
    },
  ];
  const [dialogName, setDialogName] = useState("");

  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteDialog(selectedIds[0]);
    if (result) refetch();
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
          onRefresh={() => refetch(filterParams)}
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
      <ScoreDataDialog
        open={dialogName === "ScoreDataDialog"}
        instance={answer}
        close={closeDialog}
        disabled
      />
    </>
  );
};
Answers.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Answers.wName = "Ansers";

export default Answers;
