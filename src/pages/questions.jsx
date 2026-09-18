import * as mui from "@mui/material";
import { useIntl } from "react-intl";
import { useState } from "react";
import { useApi, useFetchData } from "../api";
import { api, getError, showMessage } from "../api/commons";
import { apiBulkDeleteQuestions, apiResetQuestion } from "../api/question";
import { QuestionDialog, QuestionDataDialog } from "../dialogs/question";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ScheduleIcon from "@mui/icons-material/Schedule";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { debugLog } from "../utils/debug";
import { SERVICE_API } from "../config/env";
import { orderArrowState, planOrderSwap } from "../utils/question-order";
import {
	SELECTION_FALLBACK_SECONDS,
	defaultStartsAtInput,
	earliestStartsAt,
	selectionSecondsOf,
} from "../utils/reset-start";

const Questions = () => {
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });
	const navigate = useNavigate();
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
	// Reset dialog for a TIMED match: admin picks the new Day-1 start time.
	// `limit` is that question's own agent-kind window in seconds, which sets
	// the earliest legal start (see SELECTION_FALLBACK_SECONDS).
	const [resetTimeDialog, setResetTimeDialog] = useState({
		open: false,
		row: null,
		value: "",
		limit: SELECTION_FALLBACK_SECONDS,
	});
	// Auto-reset cron: interval in minutes per question (0/empty = off).
	const [autoResetDialog, setAutoResetDialog] = useState({
		open: false,
		row: null,
		value: "",
	});
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
				// Order is per MATCH (the backend numbers questions inside their
				// own match), so the arrows must only ever swap with a neighbour
				// in the SAME match. Against the unfiltered, cross-match list
				// they happily traded `order` with a question of another match,
				// renumbering both. Rules + tests: utils/question-order.js.
				const { isFirst, isLast } = orderArrowState(questions, row);
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
				// Match mode is flagged inside question_data (the /game/init body):
				// is_practice = self-paced solo practice; is_practice + no_reset =
				// competitive practice (final submissions + leaderboard). Surface it
				// as a chip next to the match name.
				let isPractice = false;
				let noReset = false;
				try {
					const qd = JSON.parse(row.question_data || "{}");
					isPractice = !!qd.is_practice;
					noReset = !!qd.no_reset;
				} catch {
					isPractice = false;
					noReset = false;
				}
				return (
					<mui.Stack direction="column" spacing={0.5}>
						<mui.Chip
							label={row.match.name}
							color={row.match.is_active ? "success" : "default"}
						/>
						{isPractice && (
							<mui.Chip
								size="small"
								color={noReset ? "warning" : "info"}
								variant="outlined"
								label={tr({
									id: noReset
										? "match.mode.competitivePractice"
										: "match.practice",
								})}
							/>
						)}
					</mui.Stack>
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
				// question_data holds the /game/init body: size lives under map.
				const map = data.map || data;
				return map.width ? `${map.width} x ${map.height}` : "-";
			},
		},
		// {
		// 	field: "max_ops",
		// 	headerName: "Max Ops",
		// 	flex: 0.7,
		// 	headerClassName: "tableHeader",
		// 	valueGetter: (params) => params.row.max_ops ?? "-",
		// },
		// {
		// 	field: "rotations",
		// 	headerName: "Rotations",
		// 	flex: 0.7,
		// 	headerClassName: "tableHeader",
		// 	valueGetter: (params) => params.row.rotations ?? "-",
		// },
		// {
		// 	field: "mode",
		// 	headerName: "Mode",
		// 	flex: 0.8,
		// 	headerClassName: "tableHeader",
		// 	renderCell: ({ row }) => {
		// 		const isManual =
		// 			row.mode === null || row.max_ops == null || row.rotations == null;
		// 		let modeLabel, modeColor;
		// 		if (isManual) {
		// 			modeLabel = "Manual";
		// 			modeColor = "error";
		// 		} else if (row.mode === 0) {
		// 			modeLabel = "Random";
		// 			modeColor = "info";
		// 		} else if (row.mode === 1) {
		// 			modeLabel = "Manual*";
		// 			modeColor = "warning";
		// 		} else {
		// 			modeLabel = "-";
		// 			modeColor = "default";
		// 		}
		// 		return <mui.Chip label={modeLabel} color={modeColor} size="small" />;
		// 	},
		// },
		{
			field: "question_data",
			headerName: tr({ id: "question-data" }),
			flex: 1,
			headerClassName: "tableHeader",
			renderCell: ({ row }) => {
				return (
					<mui.Tooltip title={tr({ id: "questions.viewData" })}>
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
		// {
		// 	field: "answers",
		// 	headerName: tr({ id: "answer-data" }),
		// 	flex: 1,
		// 	headerClassName: "tableHeader",
		// 	filterable: false,
		// 	sortable: false,
		// 	renderCell: ({ row }) => {
		// 		return (
		// 			<mui.Tooltip title="View All Answers">
		// 				<mui.IconButton
		// 					color="primary"
		// 					onClick={() => handleViewAnswers(row)}>
		// 					<VisibilityIcon />
		// 				</mui.IconButton>
		// 			</mui.Tooltip>
		// 		);
		// 	},
		// },
		{
			field: "actions",
			headerName: tr({ id: "actions" }),
			filterable: false,
			sortable: false,
			flex: 1,
			renderCell: ({ row }) => {
				// procon25 legacy — regenerate/optimal-answers hidden for HEXUDON.
				return (
					<mui.Stack direction="row" spacing={0.5}>
						<mui.Tooltip title={tr({ id: "questions.openGame" })}>
							<mui.IconButton
								size="small"
								color="success"
								onClick={() => navigate({ to: `/competition/game/${row.id}` })}>
								<SportsEsportsIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						<mui.Tooltip title={tr({ id: "questions.reset" })}>
							<mui.IconButton
								size="small"
								color="warning"
								onClick={() => handleResetQuestion(row)}>
								<RestartAltIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						{/* Auto-reset cron. The icon carries the state so a recycling
						    question is visible without opening anything. */}
						<mui.Tooltip
							title={
								row.auto_reset_minutes > 0
									? `${tr(
											{ id: "questions.autoResetOn" },
											{ minutes: row.auto_reset_minutes },
										)}${
											row.auto_reset_at_sec
												? ` — ${tr(
														{ id: "questions.autoResetNext" },
														{
															// Epoch SECONDS (the column has no
															// timezone; see the model comment).
															time: new Date(
																Number(row.auto_reset_at_sec) * 1000,
															).toLocaleTimeString(),
														},
													)}`
												: ""
										}`
									: tr({ id: "questions.autoReset" })
							}>
							<mui.IconButton
								size="small"
								color={row.auto_reset_minutes > 0 ? "info" : "default"}
								onClick={() =>
									setAutoResetDialog({
										open: true,
										row,
										value: String(row.auto_reset_minutes || ""),
									})
								}>
								<ScheduleIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						{row.auto_reset_minutes > 0 && (
							<mui.Chip
								size="small"
								color="info"
								variant="outlined"
								label={tr(
									{ id: "questions.autoResetOn" },
									{ minutes: row.auto_reset_minutes },
								)}
							/>
						)}
						<mui.Tooltip title={tr({ id: "Edit" })}>
							<mui.IconButton
								size="small"
								color="primary"
								onClick={() => handleEditQuestion(row)}>
								<EditIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
						<mui.Tooltip title={tr({ id: "Delete" })}>
							<mui.IconButton
								size="small"
								color="error"
								onClick={() => handleDeleteQuestion(row.id)}>
								<DeleteIcon fontSize="small" />
							</mui.IconButton>
						</mui.Tooltip>
					</mui.Stack>
				);
			},
		},
	];

	const handleViewAnswers = async (questionRow) => {
		try {
			// Fetch list of answers for this question
			// Initially without full answer_data (will be loaded when user selects team)
			const response = await api.get(`${SERVICE_API}/answer`, {
				params: {
					eq_question_id: questionRow.id,
				},
			});

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
		// The row as it is -- NOT with question_data spread over it. Only
		// name/description are editable (the board is immutable), and the
		// dialog's preview reads `question_data` itself.
		setCurrentItem({ ...questionRow });
		setDialogName("QuestionDialog");
	};

	const handleDeleteQuestion = async (questionId) => {
		openConfirmDialog(
			tr({ id: "questions.deleteTitle" }),
			tr({ id: "questions.deleteConfirm" }),
			async () => {
				const result = await apiBulkDeleteQuestions([questionId]);
				if (result) await refetch();
				closeConfirmDialog();
			},
			"error",
		);
	};

	// Do the actual reset -- ONE call to the team-manager, never a per-team
	// fan-out from the browser.
	//
	// The manager knows whether the question is one shared game (timed or
	// competitive practice) or N per-team practice games, mints its own service
	// token (a group manager's token is not an engine admin), and re-anchors
	// `question_data.startsAt` so the board gate and the play screen's
	// countdown follow the reset. Doing it here burst one engine request per
	// team against a 5/s read budget and reported "10/12".
	//
	// `startsAtSec` is ignored for practice questions (self-paced); undefined
	// lets the server pick `now + window + 1 min`.
	const doReset = async (row, startsAtSec) => {
		try {
			const result = await apiResetQuestion(row.id, startsAtSec);
			const failed = result?.failed || [];
			const reset = result?.reset || [];
			// Games the engine does not have. For PLAIN practice the bare
			// question id never exists, so a `missing` entry there is normal --
			// but if NOTHING reset and everything was missing, the question has
			// no games on the engine at all and calling that "reset" would be a
			// lie the admin acts on.
			const missing = result?.missing || [];
			if (failed.length) {
				// 502 partial: some games did reset. Name the ones that did not,
				// with the engine's reason -- "10/12" alone left the admin
				// guessing which two.
				showMessage(
					tr(
						{ id: "questions.resetPartial" },
						{
							ok: reset.length,
							total: reset.length + failed.length,
							games: failed
								.map((f) => `${f.id}${f.reason ? `: ${f.reason}` : ""}`)
								.join("; "),
						},
					),
					"warning",
					9000,
				);
			} else if (!reset.length && missing.length) {
				showMessage(
					tr(
						{ id: "questions.resetNothing" },
						{ count: missing.length, games: missing.join(", ") },
					),
					"warning",
					9000,
				);
			} else {
				showMessage(
					result?.startsAt
						? tr(
								{ id: "questions.resetDoneAt" },
								{ time: new Date(result.startsAt * 1000).toLocaleString() },
							)
						: tr({ id: "questions.resetDone" }),
					"success",
				);
			}
			await refetch();
		} catch (error) {
			showMessage(getError(error), "error", 6000);
		}
	};

	const handleResetQuestion = (row) => {
		const qdata = JSON.parse(row.question_data || "{}");
		const isPractice = !!qdata.is_practice;
		if (!isPractice) {
			// Timed match: let the admin pick the new Day-1 start time, defaulted
			// to `now + agent-kind window + 1 min` (the same value the server
			// would choose). Pre-filling the current minute used to hand every
			// team a window that was already closed -> all-patrol for everyone.
			const limit = selectionSecondsOf(row.question_data);
			setResetTimeDialog({
				open: true,
				row,
				// Rounded UP to the next whole minute (utils/reset-start.js), so
				// the prefilled value can never sit under the minimum the field's
				// own helper text -- and confirmResetTime below -- enforce.
				value: defaultStartsAtInput(limit),
				limit,
			});
			return;
		}
		openConfirmDialog(
			tr({ id: "questions.resetTitle" }),
			tr({ id: "questions.resetConfirm" }),
			async () => {
				await doReset(row, undefined);
				closeConfirmDialog();
			},
			"warning",
		);
	};

	// Save (or clear) the auto-reset interval. The manager owns the timer; the
	// first run is scheduled one interval from now, never immediately.
	const saveAutoReset = async (minutes) => {
		const { row } = autoResetDialog;
		setAutoResetDialog({ open: false, row: null, value: "" });
		if (!row) return;
		try {
			await api.put(`${SERVICE_API}/question/${row.id}/auto-reset`, { minutes });
			showMessage(
				minutes > 0
					? tr({ id: "questions.autoResetSaved" }, { minutes })
					: tr({ id: "questions.autoResetCleared" }),
				"success",
			);
			await refetch();
		} catch (error) {
			showMessage(
				error.response?.data?.message || error.message,
				"error",
				6000,
			);
		}
	};

	const closeResetTimeDialog = () =>
		setResetTimeDialog({
			open: false,
			row: null,
			value: "",
			limit: SELECTION_FALLBACK_SECONDS,
		});

	const confirmResetTime = async () => {
		const { row, value, limit } = resetTimeDialog;
		// Empty field = let the server choose its own default.
		const startsAtSec = value
			? Math.floor(new Date(value).getTime() / 1000)
			: undefined;
		// The server refuses anything earlier than `now + limit` with a 400.
		// Catch it here too: the dialog may have sat open long enough for its
		// own prefilled value to age past the minimum.
		if (startsAtSec !== undefined) {
			const earliest = earliestStartsAt(limit);
			if (startsAtSec < earliest) {
				showMessage(
					tr(
						{ id: "questions.resetTooEarly" },
						{
							seconds: limit,
							time: new Date(earliest * 1000).toLocaleString(),
						},
					),
					"error",
					7000,
				);
				return;
			}
		}
		closeResetTimeDialog();
		if (row) await doReset(row, startsAtSec);
	};

	const openConfirmDialog = (
		title,
		message,
		onConfirm,
		confirmColor = "primary",
		showCancel = true,
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
						`${SERVICE_API}/question/${questionId}/regenerate`,
					);
					await refetch();
					closeConfirmDialog();

					// Show success message with deleted answers count
					const deletedCount = response?.deletedAnswers || 0;
					showMessage(
						`Question regenerated successfully. ${deletedCount} answer(s) were deleted.`,
						"success",
					);
				} catch (error) {
					debugLog("Failed to regenerate question:", error);
					const errorMessage =
						error.response?.data?.message || "Failed to regenerate question";
					closeConfirmDialog();
					showMessage(errorMessage, "error");
				}
			},
			"warning",
		);
	};

	const handleMoveQuestion = async (questionId, direction) => {
		try {
			// Swap within the question's own match only -- see the `order`
			// column's comment. `null` = the move is not possible.
			const plan = planOrderSwap(questions, questionId, direction);
			if (!plan) return;

			// Update both questions silently (without showing success messages).
			// Two writes to the MANAGER (never the engine), so the concurrency
			// pool is not needed here.
			await Promise.all([
				api.put(`${SERVICE_API}/question/${plan.current.id}`, {
					order: plan.currentOrder,
				}),
				api.put(`${SERVICE_API}/question/${plan.target.id}`, {
					order: plan.targetOrder,
				}),
			]);
			showMessage(tr({ id: "questions.orderChanged" }), "success");

			await refetch();
		} catch (error) {
			debugLog("Failed to move question:", error);
			showMessage(tr({ id: "questions.orderChangeFailed" }), "error");
		}
	};

	const handleViewOptimalAnswers = async (questionRow) => {
		try {
			const response = await api.get(
				`${SERVICE_API}/question/${questionRow.id}/optimal-answers`,
			);
			setOptimalAnswersDialog({
				open: true,
				questionName: questionRow.name,
				moves: response.moves || [],
			});
		} catch (error) {
			debugLog("Failed to fetch optimal answers:", error);
			showMessage(tr({ id: "questions.optimalFetchFailed" }), "error");
		}
	};

	const clickNew = () => {
		setCurrentItem({
			name: "New Question",
			match_id: "",
			raw_questions: null,
		});
		setDialogName("QuestionDialog");
	};
	const closeDialog = () => {
		setDialogName("");
	};
	const clickDelete = async () => {
		openConfirmDialog(
			tr({ id: "questions.deleteManyTitle" }),
			tr({ id: "questions.deleteManyConfirm" }, { count: selectedIds.length }),
			async () => {
				const result = await apiBulkDeleteQuestions(selectedIds);
				if (result) {
					await refetch();
					setSelectedIds([]);
				}
				closeConfirmDialog();
			},
			"error",
		);
	};
	const saveInstance = async () => {
		debugLog("Saving question with data:", currentItem);

		// An EXISTING question can only be renamed/re-described: the board is
		// fixed at /game/init time and the backend rejects any attempt to
		// rewrite it. The old "manual update" and "regenerate with params"
		// branches here belonged to a previous contest year's square boards and
		// were unreachable from this dialog (which offers no board fields in
		// edit mode) -- they only ever produced 400s if a stale `type`/`mode`
		// field slipped through.
		// Normal save (no params changed or creating new)
		let result;
		if (currentItem.id) {
			// EXACTLY {name, description}. A HEXUDON board is fixed at
			// /game/init time, and PUT /question/:id now rejects any body that
			// carries `question_data`/`raw_questions`/`type` -- so spreading the
			// whole row (as this used to) made renaming a question always fail
			// with "the board is immutable". `order` travels on its own from the
			// reorder arrows.
			result = await apiEdit(currentItem.id, {
				name: currentItem.name,
				description: currentItem.description ?? null,
			});
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
					onRefresh={() => refetch()}
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
						<mui.Button onClick={closeConfirmDialog}>
							{tr({ id: "Cancel" })}
						</mui.Button>
					)}
					<mui.Button
						onClick={confirmDialog.onConfirm}
						color={confirmDialog.confirmColor || "primary"}
						variant="contained">
						{tr({ id: confirmDialog.showCancel ? "Confirm" : "OK" })}
					</mui.Button>
				</mui.DialogActions>
			</mui.Dialog>
			{/* Timed-match reset: admin picks the new Day-1 start time. */}
			<mui.Dialog open={resetTimeDialog.open} onClose={closeResetTimeDialog}>
				<mui.DialogTitle>{tr({ id: "questions.resetTitle" })}</mui.DialogTitle>
				<mui.DialogContent>
					<mui.Typography sx={{ whiteSpace: "pre-line", mb: 2 }}>
						{tr({ id: "questions.resetConfirm" })}
					</mui.Typography>
					<mui.TextField
						type="datetime-local"
						fullWidth
						label={tr({ id: "questions.startsAtLabel" })}
						slotProps={{ inputLabel: { shrink: true } }}
						// The pre-match window is [startsAt - limit, startsAt), so a
						// Day 1 closer than `limit` from now opens a window that is
						// already (partly) over -- the server refuses it with a 400.
						helperText={tr(
							{ id: "questions.resetMinHint" },
							{
								seconds: resetTimeDialog.limit,
								time: new Date(
									earliestStartsAt(resetTimeDialog.limit) * 1000,
								).toLocaleString(),
							},
						)}
						value={resetTimeDialog.value}
						onChange={(e) =>
							setResetTimeDialog((p) => ({ ...p, value: e.target.value }))
						}
					/>
				</mui.DialogContent>
				<mui.DialogActions>
					<mui.Button onClick={closeResetTimeDialog}>
						{tr({ id: "Cancel" })}
					</mui.Button>
					<mui.Button onClick={confirmResetTime} color="warning" variant="contained">
						{tr({ id: "Confirm" })}
					</mui.Button>
				</mui.DialogActions>
			</mui.Dialog>
			{/* Auto-reset cron: interval in minutes, or off. */}
			<mui.Dialog
				open={autoResetDialog.open}
				onClose={() => setAutoResetDialog({ open: false, row: null, value: "" })}>
				<mui.DialogTitle>{tr({ id: "questions.autoResetTitle" })}</mui.DialogTitle>
				<mui.DialogContent>
					<mui.Typography sx={{ whiteSpace: "pre-line", mb: 2 }}>
						{tr({ id: "questions.autoResetHint" })}
					</mui.Typography>
					<mui.TextField
						type="number"
						fullWidth
						autoFocus
						label={tr({ id: "questions.autoResetMinutes" })}
						slotProps={{ htmlInput: { min: 1, max: 1440, step: 1 } }}
						value={autoResetDialog.value}
						onChange={(e) =>
							setAutoResetDialog((p) => ({ ...p, value: e.target.value }))
						}
					/>
				</mui.DialogContent>
				<mui.DialogActions>
					<mui.Button
						onClick={() =>
							setAutoResetDialog({ open: false, row: null, value: "" })
						}>
						{tr({ id: "Cancel" })}
					</mui.Button>
					{autoResetDialog.row?.auto_reset_minutes > 0 && (
						<mui.Button color="error" onClick={() => saveAutoReset(0)}>
							{tr({ id: "questions.autoResetOff" })}
						</mui.Button>
					)}
					<mui.Button
						color="info"
						variant="contained"
						disabled={
							!Number.isInteger(Number(autoResetDialog.value)) ||
							Number(autoResetDialog.value) < 1 ||
							Number(autoResetDialog.value) > 1440
						}
						onClick={() => saveAutoReset(Number(autoResetDialog.value))}>
						{tr({ id: "Confirm" })}
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
									JSON.stringify(optimalAnswersDialog.moves),
								);
								showMessage(tr({ id: "common.copied" }), "success");
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
