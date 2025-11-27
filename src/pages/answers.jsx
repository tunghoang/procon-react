import { Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { DashboardLayout } from "../components/dashboard-layout";
import { useIntl } from "react-intl";
import { useContext, useState, useEffect } from "react";
import { useApi, useFetchData } from "../api";
import { api } from "../api/commons";
import { ScoreDataDialog } from "../dialogs/answer";
import PageToolbar from "../components/page-toolbar";
import DataTable from "../components/DataTable/data-table";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Context from "../context";
import ScoreData from "../components/procon25/score-data";
import { useParams, useSearch } from "@tanstack/react-router";

const Answers = () => {
	const { formatMessage: tr } = useIntl();
	const [selectedIds, setSelectedIds] = useState([]);
	const [dialogInstance, setDialogInstance] = useState({});
	const [dialogName, setDialogName] = useState("");
	const { round } = useContext(Context);
	const routeParams = useParams({ strict: false });
	const searchParams = useSearch({ strict: false });
	const roundId =
		routeParams.roundId ||
		searchParams.roundId ||
		searchParams.round_id ||
		round?.id;
	const { useConfirmDelete } = useApi("/answer", "Answer");
	const apiDeleteDialog = useConfirmDelete();
	const {
		data: answers,
		refetch,
		loading,
	} = useFetchData({
		path: "/answer",
		name: "Answer",
		config: {
			params: {
				"match[eq_round_id]": roundId,
			},
		},
	});

	const getScores = (scoreData) => {
		const scores = JSON.parse(scoreData || "{}");
		return isNaN(scores?.match_count)
			? Number.NEGATIVE_INFINITY
			: scores.match_count;
	};

	const columns = [
		{
			field: "team",
			headerName: "Team",
			flex: 1,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				return row.team?.name;
			},
		},
		{
			field: "question",
			headerName: "Question",
			flex: 1,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				return row.question?.name;
			},
		},
		{
			field: "match",
			headerName: "Match",
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
			headerName: "Score",
			width: 110,
			headerClassName: "tableHeader",
			filterable: true,
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
								<span style={{ marginLeft: 4, cursor: "help" }}>?</span>
							</Tooltip>
						)}
					</span>
				);
			},
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return !isNaN(scores?.match_count) ? scores.match_count : "NA";
			},
		},
		{
			field: "max_match_score",
			headerName: "Max Score",
			width: 130,
			headerClassName: "tableHeader",
			filterable: true,
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
				return !isNaN(scores?.max_match_count) ? scores.max_match_count : "NA";
			},
		},
		{
			field: "step",
			headerName: "Step",
			width: 80,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return (
					<span style={{ fontWeight: "bold", color: "#e0941bff" }}>
						{!isNaN(scores?.step_count) ? scores?.step_count : "NA"}
					</span>
				);
			},
		},
		{
			field: "resub_count",
			headerName: "Resub Count",
			width: 110,
			headerClassName: "tableHeader",
			filterable: true,
			valueGetter: ({ row }) => {
				const scores = JSON.parse(row.score_data || "{}");
				return (
					<span style={{ fontWeight: "bold", color: "#d648b7ff" }}>
						{!isNaN(scores?.resubmission_count)
							? scores?.resubmission_count
							: "NA"}
					</span>
				);
			},
		},
		{
			field: "score_view",
			headerName: "",
			width: 50,
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
				sx={{ height: "calc(100vh - 64px - 48px)", pt: 0, pb: 4, px: 2 }}>
				<DataTable
					rows={answers}
					onRefresh={async () => await refetch()}
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
