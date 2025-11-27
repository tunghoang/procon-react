import { Chip, IconButton, Paper } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useState } from "react";
import { useApi, useFetchData } from "../api";
import { QuestionDialog, QuestionDataDialog } from "../dialogs/question";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useParams, useSearch } from "@tanstack/react-router";

const Questions = () => {
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });
	const roundId =
		routeParams.roundId || searchParams.roundId || searchParams.round_id;
	const { formatMessage: tr } = useIntl();
	const [selectedIds, setSelectedIds] = useState([]);
	const [question, setQuestion] = useState({});
	const [dialogName, setDialogName] = useState("");
	const [currentItem, setCurrentItem] = useState({});
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
				"match[eq_round_id]": roundId,
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
			field: "name",
			headerName: "Name",
			width: 120,
			headerClassName: "tableHeader",
		},
		{
			field: "description",
			headerName: "Description",
			width: 200,
			headerClassName: "tableHeader",
		},
		{
			field: "match",
			headerName: "Match",
			width: 150,
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
			field: "size",
			headerName: "Size",
			width: 80,
			headerClassName: "tableHeader",
			valueGetter: (params) => {
				const data = JSON.parse(params.row.question_data || "{}");
				return data.field?.size || data.parameters?.size || "-";
			},
		},
		{
			field: "question_data",
			headerName: "Question Data",
			width: 120,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => {
				return (
					<IconButton
						onClick={() => {
							setQuestion(row);
							setDialogName("QuestionDataDialog");
						}}>
						<VisibilityIcon />
					</IconButton>
				);
			},
		},
	];

	console.log(currentItem);

	const clickNew = () => {
		setCurrentItem({
			name: "New Question",
			match_id: "",
			start_time: null,
			end_time: null,
			size: 12,
			mode: 0,
			type: "parameters",
			raw_questions: [],
		});
		setDialogName("QuestionDialog");
	};
	const openDialog = (name) => {
		const selected = questions.find((c) => c.id === selectedIds[0]);
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
		const result = await apiDeleteDialog(selectedIds);
		if (result.length) await refetch();
	};
	const saveInstance = async () => {
		console.log("Saving question with data:", currentItem);
		let result;
		if (currentItem.id) {
			result = await apiEdit(currentItem.id, currentItem);
		} else {
			result = await apiCreate(currentItem);
			setCurrentItem({});
		}
		if (result) await refetch();
		setDialogName("");
	};
	const changeInstance = (changes) => {
		setCurrentItem({ ...currentItem, ...changes });
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
				sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				<DataTable
					rows={questions}
					filterOptions={filterOptions}
					onFilter={async (params) => await refetch(params)}
					columns={columns}
					onSelectionModelChange={(ids) => {
						setSelectedIds(ids);
					}}
					loading={loading}
					onRefresh={refetch}
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
				instance={question}
				close={closeDialog}
				disabled
			/>
		</>
	);
};
Questions.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

Questions.wName = "Questions";

export default Questions;
