import {
	Chip,
	IconButton,
	Paper,
	Tooltip,
	Box,
	Typography,
} from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState } from "react";
import { useApi } from "../api";
import { api } from "../api/commons";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import Context from "../context";
import { useParams, useSearch, useNavigate } from "@tanstack/react-router";
import { useAnswers, useInvalidateAnswers } from "../api/useAnswerQuery";
import { debugLog } from "../utils/debug";
import { formatDateTime, shortFormatDateTime } from "../utils/commons";

const Answers = () => {
	const { formatMessage: tr } = useIntl();
	const [selectedIds, setSelectedIds] = useState([]);
	const [dialogInstance, setDialogInstance] = useState({});
	const [dialogName, setDialogName] = useState("");
	const { round } = useContext(Context);
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });
	const navigate = useNavigate();

	const roundId =
		routeParams.roundId ||
		searchParams.roundId ||
		searchParams.round_id ||
		round?.id;

	const { useConfirmDelete } = useApi("/answer", "Answer");
	const apiDeleteDialog = useConfirmDelete();

	// Extract filters from URL params
	const [filters, setFilters] = useState(() => {
		const urlFilters = {};
		// List of params to exclude from filters (not column filters)
		const excludeParams = [
			"roundId",
			"round_id",
			"redirect",
			"tournament_id",
			"tournamentId",
			"page",
			"limit",
		];

		Object.keys(searchParams).forEach((key) => {
			if (!excludeParams.includes(key)) {
				urlFilters[key] = searchParams[key];
			}
		});
		return urlFilters;
	});

	// Extract pagination from URL params
	const [pagination, setPagination] = useState(() => ({
		page: parseInt(searchParams.page) || 0,
		limit: parseInt(searchParams.limit) || 50,
	}));

	// Use React Query to fetch answers with caching
	const {
		data: answerResponse,
		isLoading,
		error,
		refetch,
	} = useAnswers(roundId, filters, pagination, {
		// Only fetch if roundId exists
		enabled: !!roundId,
		refetchInterval: 5000,
		staleTime: 60000,
	});

	// Extract answers and pagination metadata
	const answers = answerResponse?.data || [];
	const totalCount = answerResponse?.count || 0;
	const totalPages = answerResponse?.totalPages || 0;

	const invalidateAnswers = useInvalidateAnswers();

	// Show warning if no roundId
	if (!roundId) {
		debugLog("⚠️ No roundId provided for Answers page");
	}

	const columns = [
		{
			field: "team",
			headerName: tr({ id: "teams" }),
			flex: 1,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				return row.team?.name;
			},
		},
		{
			field: "question",
			headerName: tr({ id: "question" }),
			flex: 1,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				return row.question?.name;
			},
		},
		{
			field: "match",
			headerName: tr({ id: "match" }),
			flex: 1,
			headerClassName: "tableHeader",
			filterable: true,
			renderCell: ({ row }) => {
				return (
					<Chip
						label={row.match.name}
						color={row.match.is_active ? "success" : "default"}
					/>
				);
			},
			valueGetter: ({ row }) => {
				return row.match?.name;
			},
		},
		{
			field: "match_score",
			headerName: tr({ id: "score" }),
			flex: 0.5,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				const matchCount = scores?.match_count;
				const maxMatchCount = scores?.max_match_count;
				const isMax = matchCount === maxMatchCount;
				return (
					<span
						style={{
							color: isMax ? "#35ae35ff" : "red",
							fontWeight: "bold",
						}}>
						{!isNaN(scores?.match_count) ? scores?.match_count : "NA"}
						{!isMax && (
							<Tooltip title="Điểm chưa đạt tối đa" arrow>
								<span
									style={{
										marginLeft: 4,
										cursor: "help",
										color: "white",
										backgroundColor: "#ccc",
										display: "inline-block",
										width: "20px",
										textAlign: "center",
										borderRadius: "50%",
									}}>
									?
								</span>
							</Tooltip>
						)}
					</span>
				);
			},
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				// Return number for proper sorting (0 for NA values)
				return !isNaN(scores?.match_count) ? scores.match_count : 0;
			},
		},
		{
			field: "max_match_score",
			headerName: tr({ id: "max-score" }),
			flex: 0.5,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return (
					<span
						style={{
							color: "#35ae35ff",
							fontWeight: "bold",
						}}>
						{!isNaN(scores?.max_match_count) ? scores?.max_match_count : "NA"}
					</span>
				);
			},
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				// Return number for proper sorting (0 for NA values)
				return !isNaN(scores?.max_match_count) ? scores.max_match_count : 0;
			},
		},
		{
			field: "step",
			headerName: tr({ id: "step" }),
			flex: 0.5,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return (
					<span style={{ fontWeight: "bold", color: "#e0941bff" }}>
						{!isNaN(scores?.step_count) ? scores?.step_count : "NA"}
					</span>
				);
			},
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				// Return raw number for sorting, not JSX
				return !isNaN(scores?.step_count) ? scores.step_count : 0;
			},
		},
		{
			field: "resub_count",
			headerName: tr({ id: "resub-count" }),
			flex: 0.5,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return (
					<span style={{ fontWeight: "bold", color: "#d648b7ff" }}>
						{!isNaN(scores?.resubmission_count)
							? scores?.resubmission_count
							: "NA"}
					</span>
				);
			},
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				// Return raw number for sorting, not JSX
				return !isNaN(scores?.resubmission_count)
					? scores.resubmission_count
					: 0;
			},
		},
		{
			field: "last-submit",
			headerName: tr({ id: "last-submit" }),
			flex: 1,
			headerClassName: "tableHeader",
			filterable: false,
			renderCell: ({ row }) => {
				return <span>{shortFormatDateTime(row.submitted_time)}</span>;
			},
			valueGetter: ({ row }) => {
				return row.submitted_time;
			},
		},
		{
			field: "score_view",
			headerName: "",
			flex: 0.5,
			headerClassName: "tableHeader",
			filterable: false,
			sortable: false,
			renderCell: ({ row }) => {
				return (
					<IconButton
						onClick={async () => {
							const question = await api(
								`${import.meta.env.VITE_SERVICE_API}/question/${
									row.question_id
								}`
							);
							setDialogInstance({
								answers: [row],
								question,
							});
							setDialogName("ScoreDataDialog");
						}}>
						<VisibilityIcon />
					</IconButton>
				);
			},
		},
	];

	// Handle filter changes from DataTable
	const handleFilterChange = (newFilters) => {
		debugLog("🔍 Filters changed:", newFilters);

		// Reset to page 0 when filters change
		setPagination({ ...pagination, page: 0 });

		// Update URL params
		const params = { ...searchParams };

		// List of params to preserve (not column filters)
		const preserveParams = [
			"roundId",
			"round_id",
			"redirect",
			"tournament_id",
			"tournamentId",
			"limit",
		];

		// Remove old filter params (keep preserve params)
		Object.keys(params).forEach((key) => {
			if (!preserveParams.includes(key)) {
				delete params[key];
			}
		});

		// Add new filter params
		Object.keys(newFilters).forEach((key) => {
			if (newFilters[key]) {
				params[key] = newFilters[key];
			}
		});

		// Reset page to 0
		params.page = 0;

		// Navigate with new params (this will trigger refetch via useAnswers)
		navigate({
			to: window.location.pathname,
			search: params,
			replace: true,
		});

		// Update local filters state
		setFilters(newFilters);
	};

	// Handle pagination changes from DataTable
	const handlePaginationChange = (newPagination) => {
		debugLog("📄 Pagination changed:", newPagination);

		// Update URL params
		const params = { ...searchParams };
		params.page = newPagination.pageIndex;
		params.limit = newPagination.pageSize;

		// Navigate with new params
		navigate({
			to: window.location.pathname,
			search: params,
			replace: true,
		});

		// Update local pagination state
		setPagination({
			page: newPagination.pageIndex,
			limit: newPagination.pageSize,
		});
	};

	const closeDialog = () => {
		setDialogName("");
	};

	const clickDelete = async () => {
		const result = await apiDeleteDialog(selectedIds);
		if (result.length) {
			// Invalidate cache to refetch
			invalidateAnswers();
		}
	};

	const handleExportToXlsx = async () => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_SERVICE_API}/answer/export?round_id=${roundId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `${localStorage.getItem("token")}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error("Export failed");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `answers_round_${roundId}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Export error:", error);
			alert("Export failed. Please try again.");
		}
	};

	return (
		<>
			<PageToolbar
				title={tr({ id: "Answers" })}
				showDelete={(selectedIds || []).length}
				handleDelete={clickDelete}
				customBtns={[
					{
						label: tr({ id: "export-to-excel" }),
						icon: <DownloadIcon />,
						fn: handleExportToXlsx,
						color: "success",
					},
				]}
			/>
			<Paper
				className="Answer"
				component="main"
				sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				{error && (
					<Box
						sx={{ p: 2, bgcolor: "error.light", color: "error.contrastText" }}>
						<Typography>Error loading answers: {error.message}</Typography>
					</Box>
				)}
				<DataTable
					rows={answers}
					onRefresh={invalidateAnswers}
					onFilterChange={handleFilterChange}
					initialFilters={filters}
					columns={columns}
					onSelectionModelChange={(ids) => {
						setSelectedIds(ids);
					}}
					loading={isLoading}
					pagination={pagination}
					onPaginationChange={handlePaginationChange}
					totalCount={totalCount}
					totalPages={totalPages}
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
