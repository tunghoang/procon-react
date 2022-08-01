import { Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useEffect, useState } from "react";
import { useApi } from "../api";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import QuestionDialog from "../dialogs/question";
import { formatDateTime } from "../utils/commons";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShowJsonDataDialog from "../dialogs/show-json-data";
import CodeEditorDialog from "../dialogs/code-editor";
import Context from "../context";

const Questions = () => {
  const { formatMessage: tr } = useIntl();
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [questionData, setQuestionData] = useState();
  const { round } = useContext(Context);
  const { apiGetAll, useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/question",
    "Question"
  );
  const apiDeleteDialog = useConfirmDelete();
  const doInit = (params) => {
    (async () => {
      const results = await apiGetAll({
        params,
      });
      if (results)
        setQuestions(
          results.filter((item) => item.match.round_id === round.id)
        );
    })();
  };

  const filterOptions = [
    {
      key: "match_id",
      label: "ID",
      type: "text",
    },
    {
      key: "match_name",
      label: "Question Name",
      type: "text",
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
      field: "start_time",
      headerName: "Start Time",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: (params) => {
        return formatDateTime(params.row.start_time);
      },
    },
    {
      field: "end_time",
      headerName: "End Time",
      flex: 1,
      headerClassName: "tableHeader",
      valueGetter: (params) => {
        return formatDateTime(params.row.end_time);
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
      field: "question_data",
      headerName: "Question Data",
      flex: 1,
      headerClassName: "tableHeader",
      renderCell: ({ row }) => {
        return (
          <IconButton
            onClick={() => {
              setQuestionData(row.question_data);
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
    setCurrentItem({ name: "", start_time: "", end_time: "", match_id: "" });
    setDialogName("QuestionDialog");
  };
  const openDialog = (name) => {
    const selected = questions.find((c) => c.id === selectedIds[0]);
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
        title={tr({ id: "Questions" })}
        showNew={true}
        showEdit={(selectedIds || []).length === 1}
        showDelete={(selectedIds || []).length}
        handleNew={clickNew}
        editBtns={[
          {
            label: "Edit",
            fn: () => openDialog("QuestionDialog"),
          },
        ]}
        handleDelete={clickDelete}
      />
      <Paper
        component="main"
        sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}
      >
        <DataTable
          rows={questions}
          filterOptions={filterOptions}
          onFilter={(params) => doInit(params)}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedIds(ids);
          }}
        />
      </Paper>
      <QuestionDialog
        open={dialogName === "QuestionDialog"}
        instance={currentItem}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      {/* <ShowJsonDataDialog
        open={dialogName === "ShowJsonDataDialog"}
        instance={questionData}
        close={closeDialog}
      /> */}
      <CodeEditorDialog
        open={dialogName === "ShowJsonDataDialog"}
        instance={questionData}
        close={closeDialog}
      />
    </>
  );
};
Questions.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Questions.wName = "Questions";

export default Questions;
