import { Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState } from "react";
import { useApi, useFetchData } from "../api";
import { QuestionDialog, QuestionDataDialog } from "../dialogs/question";
import { formatDateTime } from "../utils/commons";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Context from "../context";

const Questions = () => {
  const { formatMessage: tr } = useIntl();
  const [selectedIds, setSelectedIds] = useState([]);
  const [questionData, setQuestionData] = useState({});
  const { round } = useContext(Context);
  const { useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/question",
    "Question"
  );
  const apiDeleteDialog = useConfirmDelete();
  const {
    data: questions,
    refetch,
    loading,
  } = useFetchData({
    path: "/question",
    name: "Question",
    config: {
      params: {
        "match[eq_round_id]": round?.id,
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
      label: "Question name",
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
              setQuestionData({
                questionId: row.id,
                questionData: row.question_data,
              });
              setDialogName("QuestionDataDialog");
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
    setCurrentItem({
      name: "",
      match_id: "",
      start_time: null,
      end_time: null,
      width: 32,
      height: 32,
      p: 2,
    });
    setDialogName("QuestionDialog");
  };
  const openDialog = (name) => {
    const selected = questions.find((c) => c.id === selectedIds[0]);
    console.log(selected);
    const question_data = JSON.parse(selected.question_data || "{}");
    setCurrentItem({
      ...selected,
      ...question_data,
    });
    setDialogName(name);
  };
  const closeDialog = () => {
    setDialogName("");
  };
  const clickDelete = async () => {
    const result = await apiDeleteDialog(selectedIds[0]);
    if (result) refetch();
  };
  const saveInstance = async () => {
    let result;
    if (currentItem.id) {
      result = await apiEdit(currentItem.id, currentItem);
    } else {
      result = await apiCreate(currentItem);
    }
    if (result) refetch();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    let newInst = { ...currentItem, ...changes };
    setCurrentItem(newInst);
  };

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
          onFilter={(params) => refetch(params)}
          columns={columns}
          onSelectionModelChange={(ids) => {
            setSelectedIds(ids);
          }}
          loading={loading}
        />
      </Paper>
      <QuestionDialog
        open={dialogName === "QuestionDialog"}
        instance={currentItem}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />
      <QuestionDataDialog
        open={dialogName === "QuestionDataDialog"}
        instance={questionData.questionData}
        close={closeDialog}
        disabled
      />
    </>
  );
};
Questions.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Questions.wName = "Questions";

export default Questions;
