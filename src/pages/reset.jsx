import { useContext, useState } from "react";
import {
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Divider,
	Stack,
	Typography,
	Alert,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import { useIntl } from "react-intl";
import { useSearch } from "@tanstack/react-router";
import Context from "../context";
import { api } from "../api/commons";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import WarningIcon from "@mui/icons-material/Warning";

const Reset = () => {
	const { round } = useContext(Context);
	const searchParams = useSearch({ strict: false });
	const roundId = searchParams.roundId || searchParams.round_id || round?.id;
	const [loading, setLoading] = useState({});
	const [result, setResult] = useState({});
	const [confirmDialog, setConfirmDialog] = useState({
		open: false,
		title: "",
		message: "",
		severity: "warning",
		onConfirm: null,
	});

	const openConfirmDialog = (title, message, severity, onConfirm) => {
		setConfirmDialog({
			open: true,
			title,
			message,
			severity,
			onConfirm,
		});
	};

	const closeConfirmDialog = () => {
		setConfirmDialog((prev) => ({ ...prev, open: false }));
	};

	const handleConfirm = () => {
		if (confirmDialog.onConfirm) {
			confirmDialog.onConfirm();
		}
		closeConfirmDialog();
	};

	const executeRecalculateScores = async () => {
		setLoading((prev) => ({ ...prev, recalculate: true }));
		setResult((prev) => ({ ...prev, recalculate: null }));
		try {
			const response = await api.post(
				`${import.meta.env.VITE_SERVICE_API}/answer/recalculate`,
				{ round_id: roundId }
			);
			setResult((prev) => ({ ...prev, recalculate: { success: response } }));
		} catch (error) {
			setResult((prev) => ({
				...prev,
				recalculate: { error: error.message || "Failed to recalculate scores" },
			}));
		} finally {
			setLoading((prev) => ({ ...prev, recalculate: false }));
		}
	};

	const handleRecalculateScores = () => {
		if (!roundId) {
			setResult({ recalculate: { error: "No round selected" } });
			return;
		}
		openConfirmDialog(
			"Recalculate Scores",
			`Are you sure you want to recalculate scores for all answers in round "${
				round?.name || roundId
			}"?`,
			"info",
			executeRecalculateScores
		);
	};

	const executeDeleteAnswers = async () => {
		setLoading((prev) => ({ ...prev, deleteAnswers: true }));
		setResult((prev) => ({ ...prev, deleteAnswers: null }));
		try {
			const response = await api.post(
				`${import.meta.env.VITE_SERVICE_API}/answer/delete-by-round`,
				{ round_id: roundId }
			);
			setResult((prev) => ({ ...prev, deleteAnswers: { success: response } }));
		} catch (error) {
			setResult((prev) => ({
				...prev,
				deleteAnswers: { error: error.message || "Failed to delete answers" },
			}));
		} finally {
			setLoading((prev) => ({ ...prev, deleteAnswers: false }));
		}
	};

	const handleDeleteAnswers = () => {
		if (!roundId) {
			setResult({ deleteAnswers: { error: "No round selected" } });
			return;
		}
		openConfirmDialog(
			"⚠️ Delete All Answers",
			`WARNING: Are you sure you want to delete ALL answers in round "${
				round?.name || roundId
			}"? This action cannot be undone!`,
			"error",
			executeDeleteAnswers
		);
	};

	const executeActivateMatches = async () => {
		setLoading((prev) => ({ ...prev, activateMatches: true }));
		setResult((prev) => ({ ...prev, activateMatches: null }));
		try {
			const response = await api.post(
				`${import.meta.env.VITE_SERVICE_API}/match/activate-by-round`,
				{ round_id: roundId }
			);
			setResult((prev) => ({
				...prev,
				activateMatches: { success: response },
			}));
		} catch (error) {
			setResult((prev) => ({
				...prev,
				activateMatches: {
					error: error.message || "Failed to activate matches",
				},
			}));
		} finally {
			setLoading((prev) => ({ ...prev, activateMatches: false }));
		}
	};

	const handleActivateMatches = () => {
		if (!roundId) {
			setResult({ activateMatches: { error: "No round selected" } });
			return;
		}
		openConfirmDialog(
			"Activate All Matches",
			`Are you sure you want to activate all matches in round "${
				round?.name || roundId
			}"?`,
			"success",
			executeActivateMatches
		);
	};

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h4" sx={{ mb: 3 }}>
				Admin Actions
			</Typography>
			{!roundId && (
				<Alert severity="warning" sx={{ mb: 3 }}>
					Please select a round first from the breadcrumb navigation.
				</Alert>
			)}
			{roundId && (
				<Alert severity="info" sx={{ mb: 3 }}>
					Current Round: <strong>{round?.name || `ID: ${roundId}`}</strong> (ID:{" "}
					{roundId})
				</Alert>
			)}
			<Stack spacing={3}>
				{/* Recalculate Scores */}
				<Card>
					<CardHeader
						title="Recalculate Scores"
						subheader="Recalculate all answer scores in the current round"
						avatar={<RefreshIcon color="primary" />}
					/>
					<Divider />
					<CardContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							This will recalculate the scores for all answers in the selected
							round. Use this if you've changed scoring rules or need to fix
							score inconsistencies.
						</Typography>
						<Button
							variant="contained"
							color="primary"
							onClick={handleRecalculateScores}
							disabled={loading.recalculate || !roundId}
							startIcon={
								loading.recalculate ? (
									<CircularProgress size={20} />
								) : (
									<RefreshIcon />
								)
							}>
							{loading.recalculate ? "Processing..." : "Recalculate Scores"}
						</Button>
						{result.recalculate?.success && (
							<Alert severity="success" sx={{ mt: 2 }}>
								Scores recalculated successfully!
							</Alert>
						)}
						{result.recalculate?.error && (
							<Alert severity="error" sx={{ mt: 2 }}>
								{result.recalculate.error}
							</Alert>
						)}
					</CardContent>
				</Card>

				{/* Delete Answers */}
				<Card
					sx={{
						borderColor: "error.main",
						borderWidth: 1,
						borderStyle: "solid",
					}}>
					<CardHeader
						title="Delete All Answers"
						subheader="Delete all answers in the current round"
						avatar={<DeleteForeverIcon color="error" />}
						sx={{ "& .MuiCardHeader-title": { color: "error.main" } }}
					/>
					<Divider />
					<CardContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							<strong>Warning:</strong> This will permanently delete ALL answers
							in the selected round. This action cannot be undone!
						</Typography>
						<Button
							variant="contained"
							color="error"
							onClick={handleDeleteAnswers}
							disabled={loading.deleteAnswers || !roundId}
							startIcon={
								loading.deleteAnswers ? (
									<CircularProgress size={20} />
								) : (
									<DeleteForeverIcon />
								)
							}>
							{loading.deleteAnswers ? "Deleting..." : "Delete All Answers"}
						</Button>
						{result.deleteAnswers?.success && (
							<Alert severity="success" sx={{ mt: 2 }}>
								All answers deleted successfully!
							</Alert>
						)}
						{result.deleteAnswers?.error && (
							<Alert severity="error" sx={{ mt: 2 }}>
								{result.deleteAnswers.error}
							</Alert>
						)}
					</CardContent>
				</Card>

				{/* Activate Matches */}
				<Card>
					<CardHeader
						title="Activate All Matches"
						subheader="Activate all matches in the current round"
						avatar={<PlayArrowIcon color="success" />}
					/>
					<Divider />
					<CardContent>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							This will activate all matches in the selected round, allowing
							teams to submit answers.
						</Typography>
						<Button
							variant="contained"
							color="success"
							onClick={handleActivateMatches}
							disabled={loading.activateMatches || !roundId}
							startIcon={
								loading.activateMatches ? (
									<CircularProgress size={20} />
								) : (
									<PlayArrowIcon />
								)
							}>
							{loading.activateMatches
								? "Activating..."
								: "Activate All Matches"}
						</Button>
						{result.activateMatches?.success && (
							<Alert severity="success" sx={{ mt: 2 }}>
								All matches activated successfully!
							</Alert>
						)}
						{result.activateMatches?.error && (
							<Alert severity="error" sx={{ mt: 2 }}>
								{result.activateMatches.error}
							</Alert>
						)}
					</CardContent>
				</Card>
			</Stack>

			{/* Confirm Dialog */}
			<Dialog
				open={confirmDialog.open}
				onClose={closeConfirmDialog}
				aria-labelledby="confirm-dialog-title"
				aria-describedby="confirm-dialog-description">
				<DialogTitle
					id="confirm-dialog-title"
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						color:
							confirmDialog.severity === "error"
								? "error.main"
								: confirmDialog.severity === "success"
								? "success.main"
								: "primary.main",
					}}>
					{confirmDialog.severity === "error" && <WarningIcon />}
					{confirmDialog.title}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="confirm-dialog-description">
						{confirmDialog.message}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeConfirmDialog} color="inherit">
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						color={confirmDialog.severity === "error" ? "error" : "primary"}
						variant="contained"
						autoFocus>
						Confirm
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default Reset;
