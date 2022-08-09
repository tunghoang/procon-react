import { Button, Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useEffect, useState } from "react";
import { useApi } from "../api";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import { AnswerDialog, ScoreDataDialog } from "../dialogs/answer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Context from "../context";

const Answers = () => {
  const { formatMessage: tr } = useIntl();
  const [answers, setAnswers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [scoreData, setScoreData] = useState({});
  const { round } = useContext(Context);
  const { apiGetAll, useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/answer",
    "Answer"
  );
  const apiDeleteDialog = useConfirmDelete();
  const doInit = (params) => {
    (async () => {
      const results = await apiGetAll({
        params: {
          "match[eq_round_id]": round.id,
          ...params,
        },
      });
      if (results) setAnswers(results);
    })();
  };

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

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 100,
      headerClassName: "tableHeader",
    },
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
          <IconButton
            onClick={() => {
              setScoreData({
                questionId: row.question_id,
                answerId: row.id,
                scoreData: row.score_data,
              });
              setDialogName("ScoreDataDialog");
            }}
          >
            <VisibilityIcon />
          </IconButton>
        );
      },
    },
  ];
  const [dialogName, setDialogName] = useState("");
  const [currentItem, setCurrentItem] = useState({});

  const clickNew = () => {
    setCurrentItem({ question_id: "", team_id: "", answer_data: null });
    setDialogName("AnswerDialog");
  };
  const openDialog = (name) => {
    const selected = answers.find((c) => c.id === selectedIds[0]);
    setCurrentItem(selected);
    setDialogName(name);
  };
  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteDialog(selectedIds[0]);
    if (result) doInit();
  };
  const saveInstance = async () => {
    let result;
    if (currentItem.id) {
      result = await apiEdit(currentItem.id, currentItem);
    } else {
      result = await apiCreate(currentItem);
    }
    if (result) doInit();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    let newInst = { ...currentItem, ...changes };
    setCurrentItem(newInst);
  };

  useEffect(doInit, []);

  return (
    <>
      <PageToolbar
        title={tr({ id: "Answers" })}
        showNew={true}
        showEdit={(selectedIds || []).length === 1}
        showDelete={(selectedIds || []).length}
        handleNew={clickNew}
        editBtns={[
          {
            label: "Edit",
            fn: () => openDialog("AnswerDialog"),
          },
        ]}
        handleDelete={clickDelete}
      />
      <Paper
        component="main"
        sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}
      >
        <DataTable
          rows={answers}
          filterOptions={filterOptions}
          onFilter={(params) => doInit(params)}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedIds(ids);
          }}
        />
      </Paper>
      <AnswerDialog
        open={dialogName === "AnswerDialog"}
        instance={currentItem}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      <ScoreDataDialog
        open={dialogName === "ScoreDataDialog"}
        instance={scoreData.scoreData}
        questionId={scoreData.questionId}
        answerId={scoreData.answerId}
        close={closeDialog}
        disabled
      />
    </>
  );
};
Answers.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Answers.wName = "Ansers";

export default Answers;
