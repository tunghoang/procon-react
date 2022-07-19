import { Button, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useEffect, useState } from "react";
import { useApi } from "../api";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import AnswerDialog from "../dialogs/answer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShowJsonDataDialog from "../dialogs/show-json-data";

const Answers = () => {
  const { formatMessage: tr } = useIntl();
  const [answers, setAnswers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [jsonData, setJsonData] = useState();
  const { apiGetAll, useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/answer",
    "Answer"
  );
  const apiDeleteDialog = useConfirmDelete();
  const doInit = () => {
    (async () => {
      const results = await apiGetAll();
      console.log(results);
      if (results) setAnswers(results);
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
      field: "question",
      headerName: "Question",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <Button
            onClick={() => {
              setJsonData(row.question.question_data);
              setDialogName("ShowJsonDataDialog");
            }}
          >
            {row.question.name}
          </Button>
        );
      },
    },
    {
      field: "team",
      headerName: "Team Id",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: ({ row }) => {
        return row.team?.name;
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
              setJsonData(row.score_data);
              setDialogName("ShowJsonDataDialog");
            }}
          >
            <VisibilityIcon />
          </IconButton>
        );
      },
    },
    {
      field: "answer_data",
      headerName: "Answer Data",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <IconButton
            onClick={() => {
              setJsonData(row.answer_data);
              setDialogName("ShowJsonDataDialog");
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
    setCurrentItem({ question_id: "", team_id: "", answer_data: {} });
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
      <ShowJsonDataDialog
        open={dialogName === "ShowJsonDataDialog"}
        instance={jsonData}
        close={closeDialog}
      />
    </>
  );
};
Answers.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Answers.wName = "Ansers";

export default Answers;
