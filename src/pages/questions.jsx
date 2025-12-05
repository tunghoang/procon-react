import * as mui from "@mui/material";
import { useIntl } from "react-intl";
import { useState } from "react";
import { useApi, useFetchData } from "../api";
import { api, showMessage } from "../api/commons";
import { apiBulkDeleteQuestions } from "../api/question";
import { QuestionDialog, QuestionDataDialog } from "../dialogs/question";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams, useSearch } from "@tanstack/react-router";
import { debugLog } from "../utils/debug";

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
	const [answerInstance, setAnswerInstance] = useState(null);
	const [confirmDialog, setConfirmDialog] = useState({
		open: false,
		title: "",
		message: "",
		onConfirm: null,
		confirmColor: "primary",
		showCancel: true,
	});
	const [optimalAnswersDialog, setOptimalAnswersDialog] = useState({
		open: false,
		questionName: "",
		moves: [],
	});
	const [originalParams, setOriginalParams] = useState(null);
	const { apiCreate, apiEdit } = useApi("/question", "Question");
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
			field: "id",
			headerName: "ID",
			flex: 0.5,
			headerClassName: "tableHeader",
		},
		{
			field: "order",
			headerName: "Order",
			flex: 0.8,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				const currentIndex = questions.findIndex((q) => q.id === row.id);
				const isFirst = currentIndex === 0;
				const isLast = currentIndex === questions.length - 1;
				return (
					<mui.Stack direction="row" alignItems="center" spacing={0}>
						<mui.Typography
							variant="body2"
							sx={{ minWidth: 24, textAlign: "center" }}>
							{row.order ?? "-"}
						</mui.Typography>
						<mui.IconButton
							size="small"
							disabled={isFirst}
							onClick={() => handleMoveQuestion(row.id, "up")}>
							<KeyboardArrowUpIcon fontSize="small" />
						</mui.IconButton>
						<mui.IconButton
							size="small"
							disabled={isLast}
							onClick={() => handleMoveQuestion(row.id, "down")}>
							<KeyboardArrowDownIcon fontSize="small" />
						</mui.IconButton>
					</mui.Stack>
				);
			},
		},
		{
			field: "name",
			headerName: tr({ id: "name" }),
			flex: 1.5,
			headerClassName: "tableHeader",
		},
		{
			field: "description",
			headerName: tr({ id: "description" }),
			flex: 2,
			headerClassName: "tableHeader",
		},
		{
			field: "match",
			headerName: tr({ id: "match" }),
			flex: 1,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => {
				return (
					<mui.Chip
						label={row.match.name}
						color={row.match.is_active ? "success" : "default"}
					/>
				);
			},
			valueGetter: (params) => {
				return params.row.match.name;
			},
		},
		{
			field: "size",
			headerName: tr({ id: "size" }),
			flex: 0.7,
			headerClassName: "tableHeader",
			valueGetter: (params) => {
				const data = JSON.parse(params.row.question_data || "{}");
				return data.field?.size || data.parameters?.size || "-";
			},
		},
		{
			field: "max_ops",
			headerName: "Max Ops",
			flex: 0.7,
			headerClassName: "tableHeader",
			valueGetter: (params) => params.row.max_ops ?? "-",
		},
		{
			field: "rotations",
			headerName: "Rotations",
			flex: 0.7,
			headerClassName: "tableHeader",
			valueGetter: (params) => params.row.rotations ?? "-",
		},
		{
			field: "mode",
			headerName: "Mode",
			flex: 0.8,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => {
				const isManual =
					row.mode === null || row.max_ops == null || row.rotations == null;
				let modeLabel, modeColor;
				if (isManual) {
					modeLabel = "Manual";
					modeColor = "error";
				} else if (row.mode === 0) {
					modeLabel = "Random";
					modeColor = "info";
				} else if (row.mode === 1) {
					modeLabel = "Manual*";
					modeColor = "warning";
				} else {
					modeLabel = "-";
					modeColor = "default";
				}
				return <mui.Chip label={modeLabel} color={modeColor} size="small" />;
			},
		},
		{
			field: "question_data",
			headerName: tr({ id: "question-data" }),
			flex: 1,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => {
				return (
					<mui.Tooltip title="View Question Data">
						<mui.IconButton
							onClick={() => {
								setQuestion(row);
								setDialogName("QuestionDataDialog");
							}}>
							<VisibilityIcon />
						</mui.IconButton>
					</mui.Tooltip>
				);
			},
		},
		{
			field: "answers",
			headerName: tr({ id: "answer-data" }),
			flex: 1,
			headerClassName: "tableHeader",
			filterable: false,
			sortable: false,
			renderCell: ({ row }) => {
				return (
					<mui.Tooltip title="View All Answers">
						<mui.IconButton
							color="primary"
							onClick={() => handleViewAnswers(row)}>
							<VisibilityIcon />
						</mui.IconButton>
					</mui.Tooltip>
				);
			},
		},
		{
			field: "actions",
			headerName: tr({ id: "actions" }),
			filterable: false,
			sortable: false,
			flex: 1,
			renderCell: ({ row }) => {
				const isManual =
					row.mode === null || row.max_ops == null || row.rotations == null;
				const isSpecial =
					row.mode === 1 && row.max_ops != null && row.rotations != null;
				return (
					<mui.Stack direction="row" spacing={0.5}>
						<mui.Tooltip
							title={
								isManual ? "Cannot regenerate manual question" : "Regenerate"
							}>
							<span>
								<mui.IconButton
									size="small"
									color="warning"
									disabled={isManual}
									onClick={() => handleRegenerateQuestion(row.id)}>
									<AutorenewIcon fontSize="small" />
								</mui.IconButton>
							</span>
						</mui.Tooltip>
						<mui.Tooltip title="Edit">
							<mui.IconButton
								size="small"
								color="primary"
								onClick={() => handleEditQuestion(row)}>
								<EditIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						<mui.Tooltip title="Delete">
							<mui.IconButton
								size="small"
								color="error"
								onClick={() => handleDeleteQuestion(row.id)}>
								<DeleteIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						{isSpecial && (
							<mui.Tooltip title="View Optimal Answers">
								<mui.IconButton
									size="small"
									color="success"
									onClick={() => handleViewOptimalAnswers(row)}>
									<VisibilityIcon fontSize="small" />
								</mui.IconButton>
							</mui.Tooltip>
						)}
					</mui.Stack>
				);
			},
		},
	];

	const handleViewAnswers = async (questionRow) => {
		try {
			// Fetch list of answers for this question
			// Initially without full answer_data (will be loaded when user selects team)
			const response = await api.get(
				`${import.meta.env.VITE_SERVICE_API}/answer`,
				{
					params: {
						eq_question_id: questionRow.id,
					},
				}
			);

			// Backend returns { count, data } format
			const answersArray = response.data || [];

			// Set instance for ScoreDataDialog
			setAnswerInstance({
				answers: answersArray,
				question: questionRow,
			});
			setDialogName("ScoreDataDialog");
		} catch (error) {
			console.error("Failed to fetch answers:", error);
			setAnswerInstance({
				answers: [],
				question: questionRow,
			});
		}
	};

	const handleEditQuestion = (questionRow) => {
		const question_data = JSON.parse(questionRow.question_data || "{}");
		const size =
			question_data.field?.size || question_data.parameters?.size || 12;
		setCurrentItem({
			...questionRow,
			...question_data,
			size,
		});
		// Store original params for comparison
		setOriginalParams({
			size,
			mode: questionRow.mode,
			max_ops: questionRow.max_ops,
			rotations: questionRow.rotations,
		});
		setDialogName("QuestionDialog");
	};

	const handleDeleteQuestion = async (questionId) => {
		openConfirmDialog(
			"Delete Question",
			"Are you sure you want to delete this question? This will also delete all associated answers.",
			async () => {
				const result = await apiBulkDeleteQuestions([questionId]);
				if (result) await refetch();
				closeConfirmDialog();
			},
			"error"
		);
	};

	const openConfirmDialog = (
		title,
		message,
		onConfirm,
		confirmColor = "primary",
		showCancel = true
	) => {
		setConfirmDialog({
			open: true,
			title,
			message,
			onConfirm,
			confirmColor,
			showCancel,
		});
	};

	const closeConfirmDialog = () => {
		setConfirmDialog((prev) => ({ ...prev, open: false }));
	};

	const handleRegenerateQuestion = async (questionId) => {
		openConfirmDialog(
			"⚠️ Regenerate Question",
			"Are you sure you want to regenerate this question? This will:\n• Generate a completely new board\n• Delete ALL existing answers for this question\n• Cannot be undone\n\nDo you want to continue?",
			async () => {
				try {
					const response = await api.put(
						`${
							import.meta.env.VITE_SERVICE_API
						}/question/${questionId}/regenerate`
					);
					await refetch();
					closeConfirmDialog();

					// Show success message with deleted answers count
					const deletedCount = response?.deletedAnswers || 0;
					showMessage(
						`Question regenerated successfully. ${deletedCount} answer(s) were deleted.`,
						"success"
					);
				} catch (error) {
					debugLog("Failed to regenerate question:", error);
					const errorMessage =
						error.response?.data?.message || "Failed to regenerate question";
					closeConfirmDialog();
					showMessage(errorMessage, "error");
				}
			},
			"warning"
		);
	};

	const handleMoveQuestion = async (questionId, direction) => {
		try {
			const currentIndex = questions.findIndex((q) => q.id === questionId);
			if (currentIndex === -1) return;

			const targetIndex =
				direction === "up" ? currentIndex - 1 : currentIndex + 1;
			if (targetIndex < 0 || targetIndex >= questions.length) return;

			const currentQuestion = questions[currentIndex];
			const targetQuestion = questions[targetIndex];

			// Swap orders
			const currentOrder = currentQuestion.order ?? currentIndex;
			const targetOrder = targetQuestion.order ?? targetIndex;

			// Update both questions silently (without showing success messages)
			await Promise.all([
				api.put(
					`${import.meta.env.VITE_SERVICE_API}/question/${currentQuestion.id}`,
					{ order: targetOrder }
				),
				api.put(
					`${import.meta.env.VITE_SERVICE_API}/question/${targetQuestion.id}`,
					{ order: currentOrder }
				),
			]);
			showMessage("Question order changed successfully", "success");

			await refetch();
		} catch (error) {
			debugLog("Failed to move question:", error);
			showMessage("Failed to change order", "error");
		}
	};

	const handleViewOptimalAnswers = async (questionRow) => {
		try {
			const response = await api.get(
				`${import.meta.env.VITE_SERVICE_API}/question/${
					questionRow.id
				}/optimal-answers`
			);
			setOptimalAnswersDialog({
				open: true,
				questionName: questionRow.name,
				moves: response.moves || [],
			});
		} catch (error) {
			debugLog("Failed to fetch optimal answers:", error);
			showMessage("Failed to fetch optimal answers", "error");
		}
	};

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
	const closeDialog = () => {
		setDialogName("");
	};
	const clickDelete = async () => {
		openConfirmDialog(
			"Delete Questions",
			`Are you sure you want to delete ${selectedIds.length} question(s)? This will also delete all associated answers.`,
			async () => {
				const result = await apiBulkDeleteQuestions(selectedIds);
				if (result) {
					await refetch();
					setSelectedIds([]);
				}
				closeConfirmDialog();
			},
			"error"
		);
	};
	const saveInstance = async () => {
		debugLog("Saving question with data:", currentItem);

		// Check if editing and parameters changed (for non-manual questions)
		if (currentItem.id && originalParams && currentItem.mode != null) {
			const paramsChanged =
				originalParams.size !== currentItem.size ||
				originalParams.mode !== currentItem.mode ||
				originalParams.max_ops !== currentItem.max_ops ||
				originalParams.rotations !== currentItem.rotations;

			if (paramsChanged) {
				// Show warning dialog
				openConfirmDialog(
					"⚠️ Regenerate Question",
					"You have changed the question parameters (size, mode, max_ops, or rotations).\n\nThis will:\n• Generate a completely new board\n• Delete ALL existing answers for this question\n• Cannot be undone\n\nDo you want to continue?",
					async () => {
						try {
							await api.put(
								`${import.meta.env.VITE_SERVICE_API}/question/${
									currentItem.id
								}/regenerate-with-params`,
								{
									size: currentItem.size,
									mode: currentItem.mode,
									max_ops: currentItem.max_ops,
									rotations: currentItem.rotations,
									name: currentItem.name,
									description: currentItem.description,
								}
							);
							showMessage(
								"Question updated and regenerated successfully",
								"success"
							);
							await refetch();
							closeConfirmDialog();
							setDialogName("");
							setOriginalParams(null);
						} catch (error) {
							debugLog("Failed to regenerate question:", error);
							const errorMessage =
								error.response?.data?.message ||
								"Failed to regenerate question";
							showMessage(errorMessage, "error");
							closeConfirmDialog();
						}
					},
					"warning"
				);
				return;
			}
		}

		// Normal save (no params changed or creating new)
		let result;
		if (currentItem.id) {
			result = await apiEdit(currentItem.id, currentItem);
		} else {
			result = await apiCreate(currentItem);
			setCurrentItem({});
		}
		if (result) await refetch();
		setDialogName("");
		setOriginalParams(null);
	};
	const changeInstance = (changes) => {
		setCurrentItem({ ...currentItem, ...changes });
	};

	return (
		<>
			<PageToolbar
				title={tr({ id: "Questions" })}
				showNew={true}
				showDelete={(selectedIds || []).length}
				handleNew={clickNew}
				handleDelete={clickDelete}
			/>
			<mui.Paper
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
			</mui.Paper>
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
			<ScoreDataDialog
				open={dialogName === "ScoreDataDialog"}
				instance={answerInstance}
				close={closeDialog}
			/>
			<mui.Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
				<mui.DialogTitle>{confirmDialog.title}</mui.DialogTitle>
				<mui.DialogContent>
					<mui.Typography sx={{ whiteSpace: "pre-line" }}>
						{confirmDialog.message}
					</mui.Typography>
				</mui.DialogContent>
				<mui.DialogActions>
					{confirmDialog.showCancel && (
						<mui.Button onClick={closeConfirmDialog}>Cancel</mui.Button>
					)}
					<mui.Button
						onClick={confirmDialog.onConfirm}
						color={confirmDialog.confirmColor || "primary"}
						variant="contained">
						{confirmDialog.showCancel ? "Confirm" : "OK"}
					</mui.Button>
				</mui.DialogActions>
			</mui.Dialog>
			<mui.Dialog
				open={optimalAnswersDialog.open}
				onClose={() =>
					setOptimalAnswersDialog({ open: false, questionName: "", moves: [] })
				}
				maxWidth="md"
				fullWidth>
				<mui.DialogTitle>
					Optimal Answers - {optimalAnswersDialog.questionName}
				</mui.DialogTitle>
				<mui.DialogContent>
					{optimalAnswersDialog.moves.length > 0 ? (
						<mui.Box sx={{ mt: 1 }}>
							<mui.Typography variant="subtitle2" gutterBottom>
								Total moves: {optimalAnswersDialog.moves.length}
							</mui.Typography>
							<mui.Paper
								variant="outlined"
								sx={{
									p: 2,
									maxHeight: 400,
									overflow: "auto",
									bgcolor: "grey.50",
									fontFamily: "monospace",
								}}>
								<pre style={{ margin: 0 }}>
									{JSON.stringify(optimalAnswersDialog.moves, null, 2)}
								</pre>
							</mui.Paper>
						</mui.Box>
					) : (
						<mui.Typography color="text.secondary">
							No optimal answers available for this question.
						</mui.Typography>
					)}
				</mui.DialogContent>
				<mui.DialogActions>
					{optimalAnswersDialog.moves.length > 0 && (
						<mui.Button
							startIcon={<ContentCopyIcon />}
							onClick={() => {
								navigator.clipboard.writeText(
									JSON.stringify(optimalAnswersDialog.moves)
								);
								showMessage("Copied to clipboard!", "success");
							}}>
							Copy
						</mui.Button>
					)}
					<mui.Button
						onClick={() =>
							setOptimalAnswersDialog({
								open: false,
								questionName: "",
								moves: [],
							})
						}>
						Close
					</mui.Button>
				</mui.DialogActions>
			</mui.Dialog>
		</>
	);
};

Questions.wName = "Questions";

export default Questions;
