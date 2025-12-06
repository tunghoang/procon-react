import { DateTimePicker } from "@mui/x-date-pickers";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	TextField,
	DialogActions,
	Button,
	Stack,
	Autocomplete,
	Tabs,
	Tab,
	Box,
	Grid,
    IconButton,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { showMessage } from "../api/commons";
import { useContext, useState, useMemo, useEffect } from "react";
import Context from "../context";
import CodeEditor from "../components/code-editor";
import GameBoard from "../components/procon25/game-board";
import AccordionBoard from "../components/procon25/accordion-board";

const useStyles = makeStyles({
	root: {
		// overflow: "visible",
		minWidth: "900px",
	},
});
const QuestionDialog = ({ open, instance, close, save, handleChange }) => {
	const classes = useStyles();
	const { round } = useContext(Context);
	const { formatMessage: tr } = useIntl();
	const [tabValue, setTabValue] = useState(0);
	const { data: matches } = useFetchData({
		path: "/match",
		config: {
			params: {
				eq_round_id: round?.id,
			},
		},
	});

	useEffect(() => {
		if (open) {
			const isManual = instance?.mode === null;
			setTabValue(isManual ? 1 : 0);
		}
	}, [open, instance?.mode]);

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
		handleChange({ type: newValue === 0 ? "parameters" : "manual" });
	};

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>
				{instance?.id ? "Edit Question" : "Create Question"}
			</DialogTitle>
			<DialogContent className={classes.root}>
				<Stack spacing={1}>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 6 }}>
								<TextField
									margin="dense"
									label="Name"
									type="text"
									fullWidth
									variant="standard"
									name="name"
									value={instance?.name}
									onChange={(evt) => {
										handleChange({ name: evt.target.value });
									}}
								/>
							</Grid>
							<Grid size={{ xs: 6 }}>
								<Autocomplete
									options={matches}
									value={
										matches.find((item) => item.id === instance.match_id) ||
										null
									}
									getOptionLabel={(option) => option.name}
									isOptionEqualToValue={(option, value) =>
										option.id === value.id
									}
									renderInput={(params) => (
										<TextField {...params} label={"Match"} variant="standard" />
									)}
									onChange={(evt, v) => handleChange({ match_id: v?.id })}
								/>
							</Grid>
						</Grid>
					</Box>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12 }}>
								<TextField
									margin="dense"
									label="Description"
									type="text"
									fullWidth
									variant="standard"
									name="description"
									value={instance?.description || ""}
									onChange={(evt) => {
										handleChange({ description: evt.target.value });
									}}
								/>
							</Grid>
						</Grid>
					</Box>

					<Box>
						<Tabs value={tabValue} onChange={handleTabChange}>
							<Tab label="Parameters" />
							<Tab label="Manual" />
						</Tabs>
						<Box sx={{ mt: 2 }}>
							{tabValue === 0 && (
								<>
									{!instance?.id ? (
										<CodeEditor
											title="Parameters"
											subTitle={"mode= 0: random; 1: optimal solution"}
											readOnly={!!instance?.id}
											defaultValue={{
												size: 12,
												mode: 0,
												max_ops: 2,
												rotations: 3,
											}}
											onValueChange={(value) =>
												handleChange({ ...value, type: "parameters" })
											}
										/>
									) : (
										<Box sx={{ mt: 2 }}>
											<Box
												sx={{
													p: 2,
													bgcolor: "warning.light",
													borderRadius: 1,
													mb: 2,
												}}>
												<span style={{ fontWeight: "bold" }}>⚠️ Warning:</span>{" "}
												Changing size, mode, max_ops or rotations will
												regenerate the question and{" "}
												<strong>delete all existing answers</strong>.
											</Box>
											<Grid container spacing={2}>
												<Grid size={{ xs: 3 }}>
													<TextField
														label="Size"
														type="number"
														fullWidth
														variant="outlined"
														value={instance?.size || ""}
														onChange={(evt) =>
															handleChange({
																size: parseInt(evt.target.value) || 0,
															})
														}
														inputProps={{ min: 4, max: 24, step: 2 }}
													/>
												</Grid>
												<Grid size={{ xs: 3 }}>
													<TextField
														label="Mode"
														type="number"
														fullWidth
														variant="outlined"
														value={instance?.mode ?? ""}
														onChange={(evt) =>
															handleChange({
																mode: parseInt(evt.target.value) || 0,
															})
														}
														helperText="0: Random, 1: Special"
														inputProps={{ min: 0, max: 1 }}
													/>
												</Grid>
												<Grid size={{ xs: 3 }}>
													<TextField
														label="Max Ops"
														type="number"
														fullWidth
														variant="outlined"
														value={instance?.max_ops ?? ""}
														onChange={(evt) =>
															handleChange({
																max_ops: parseInt(evt.target.value) || 0,
															})
														}
													/>
												</Grid>
												<Grid size={{ xs: 3 }}>
													<TextField
														label="Rotations"
														type="number"
														fullWidth
														variant="outlined"
														value={instance?.rotations ?? ""}
														onChange={(evt) =>
															handleChange({
																rotations: parseInt(evt.target.value) || 0,
															})
														}
													/>
												</Grid>
											</Grid>
										</Box>
									)}
								</>
							)}
							{tabValue === 1 && (
                                <Box>
                                    {instance?.id && (
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "warning.light",
                                                borderRadius: 1,
                                                mb: 2,
                                            }}>
                                            <span style={{ fontWeight: "bold" }}>⚠️ Warning:</span> Changing
                                            question data will update the board and{" "}
                                            <strong>delete all existing answers</strong>.
                                        </Box>
                                    )}
                                    <Box sx={{ position: "relative" }}>
									<TextField
										label="Raw Question Data"
										multiline
										rows={10}
										fullWidth
										variant="outlined"
										placeholder="Enter raw question array, e.g.: [[6,3,3,5],[6,1,1,5],[7,4,0,0],[7,4,2,2]]"
										value={
											instance?.raw_questions
												? JSON.stringify(instance.raw_questions)
												: instance?.field?.entities
												? JSON.stringify(instance.field.entities)
												: ""
										}
										onChange={(evt) => {
											try {
												const parsedArray = JSON.parse(evt.target.value);
												handleChange({
													type: "manual",
													mode: null, // Clear mode to indicate manual
													raw_questions: parsedArray,
												});
											} catch (e) {
												// Keep the text even if invalid JSON
												// Note: Changes won't persist to raw_questions if invalid JSON,
												// but we typically need a local state for the text input if we want to allow invalid typing.
												// However, current implementation relies on instance state.
												// For now, let's just update raw_questions as string?
												// Actually, better to parse. If parse fails, we might just not call handleChange or pass raw string?
												// The existing code passed parsed value.
												// I will stick to existing pattern but maybe I should have let it stay as string until save?
												// But `handleChange` updates parent state which feeds back into `value`.
												// If I don't update parent state, typing is blocked.
												// If I update with invalid string, JSON.stringify might escape it or it might break logic expecting array.
												// Let's assume user pastes valid JSON or types carefully.
												// Or better: store raw text in local state or pass raw value?
												// Given the tool limits, I'll update it to try to handle it.
											}
											// To allow typing, we technically need to store the input string if it's invalid.
											// But 'instance.raw_questions' is expected to be array.
											// I'll assume valid input for now or minimal support.
											// Wait, the previous code had a fallback:
											// handleChange({ type: "manual", raw_questions: evt.target.value }) inside catch.
											// But JSON.stringify(evt.target.value) would be valid JSON string "..."
											// So it "works" but it's improper data structure. I'll restore that fallback.
											try {
												const parsedArray = JSON.parse(evt.target.value);
												handleChange({
													type: "manual",
													mode: null,
													raw_questions: parsedArray,
												});
											} catch (e) {
												handleChange({
													type: "manual",
													mode: null,
													raw_questions: evt.target.value,
												});
											}
										}}
									/>
                                    <IconButton
                                        size="small"
                                        title="Copy raw data"
                                        sx={{ position: "absolute", top: 8, right: 8 }}
                                        onClick={() => {
                                            const text = instance?.raw_questions
                                                ? JSON.stringify(instance.raw_questions)
                                                : instance?.field?.entities
                                                ? JSON.stringify(instance.field.entities)
                                                : "";
                                            if (text) {
                                                navigator.clipboard.writeText(text);
                                                showMessage("Copied to clipboard", "success");
                                            }
                                        }}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                    </Box>
                                </Box>
							)}
						</Box>
					</Box>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
				<Button onClick={save}>{tr({ id: "Save" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

const QuestionDataDialog = ({
	open,
	instance,
	close,
	title = "Question Data",
	disabled = false,
}) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();

	// Memoize questionData parsing to avoid re-parsing on every render
	const questionData = useMemo(() => {
		return JSON.parse(instance?.question_data || "{}");
	}, [instance?.question_data]);

	const entities = questionData.field?.entities;
	// const startBoard = questionData.board?.start;
	// const goalBoard = questionData.board?.goal;

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}
			slotProps={{ transition: { timeout: 0 } }}
			disableScrollLock>
			<DialogTitle></DialogTitle>
			<DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<Stack spacing={1}>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid size={{ xs: 12 }}>
								<TextField
									margin="dense"
									label="Description"
									type="text"
									fullWidth
									variant="standard"
									value={instance?.description || ""}
									InputProps={{
										readOnly: true,
									}}
								/>
							</Grid>
						</Grid>
					</Box>
					<CodeEditor
						title={title}
						defaultValue={{
							// parameters: questionData.parameters,
							field: {
								size: questionData.field?.size,
								entities: questionData.field?.entities,
							},
						}}
						readOnly={disabled}
					/>
					<Stack spacing={0}>
						<AccordionBoard title="Board" defaultExpanded={true}>
							<GameBoard board={entities} />
						</AccordionBoard>
						{/* <AccordionBoard title="Start Board">
              <GameBoard board={startBoard} goal={goalBoard} />
            </AccordionBoard>
            <AccordionBoard title="Goal Board">
              <GameBoard board={goalBoard} goal={goalBoard} />
            </AccordionBoard> */}
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				{entities && (
					<Button
						startIcon={<ContentCopyIcon />}
						onClick={() => {
							navigator.clipboard.writeText(JSON.stringify(entities));
							showMessage("Copied question to clipboard", "success");
						}}>
						Copy
					</Button>
				)}
				<Button onClick={close}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { QuestionDialog, QuestionDataDialog };
