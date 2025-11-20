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
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { useContext, useState } from "react";
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
							<Grid item xs={6}>
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
							<Grid item xs={6}>
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
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Match Factor"
									type="number"
									fullWidth
									variant="standard"
									name="match_factor"
									value={instance?.match_factor ?? 1.0}
									onChange={(evt) => {
										handleChange({
											match_factor: parseFloat(evt.target.value) || 1.0,
										});
									}}
									helperText="Multiplier for matching pairs (default: 1.0)"
								/>
							</Grid>
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Step Factor"
									type="number"
									fullWidth
									variant="standard"
									name="step_factor"
									value={instance?.step_factor ?? -0.05}
									onChange={(evt) => {
										handleChange({
											step_factor: parseFloat(evt.target.value) || -0.05,
										});
									}}
									helperText="Penalty per step (default: -0.05)"
								/>
							</Grid>
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Resubmission Factor"
									type="number"
									fullWidth
									variant="standard"
									name="resub_factor"
									value={instance?.resub_factor ?? -10.0}
									onChange={(evt) => {
										handleChange({
											resub_factor: parseFloat(evt.target.value) || -10.0,
										});
									}}
									helperText="Penalty for resubmission (default: -10.0)"
								/>
							</Grid>
						</Grid>
					</Box>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid item xs={12}>
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
					{!instance?.id && (
						<Box>
							<Tabs value={tabValue} onChange={handleTabChange}>
								<Tab label="Parameters" />
								<Tab label="Manual" />
							</Tabs>
							<Box sx={{ mt: 2 }}>
								{tabValue === 0 && (
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
								)}
								{tabValue === 1 && (
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
												: ""
										}
										onChange={(evt) => {
											try {
												const parsedArray = JSON.parse(evt.target.value);
												handleChange({
													type: "manual",
													raw_questions: parsedArray,
												});
											} catch (e) {
												// Keep the text even if invalid JSON
												handleChange({
													type: "manual",
													raw_questions: evt.target.value,
												});
											}
										}}
									/>
								)}
							</Box>
						</Box>
					)}
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

	const questionData = JSON.parse(instance?.question_data || "{}");
	const entities = questionData.field?.entities;
	// const startBoard = questionData.board?.start;
	// const goalBoard = questionData.board?.goal;

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle></DialogTitle>
			<DialogContent className={classes.root} style={{ minWidth: 500 }}>
				<Stack spacing={1}>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Match Factor"
									type="number"
									fullWidth
									variant="standard"
									value={instance?.match_factor ?? 1.0}
									InputProps={{
										readOnly: true,
									}}
								/>
							</Grid>
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Step Factor"
									type="number"
									fullWidth
									variant="standard"
									value={instance?.step_factor ?? -0.05}
									InputProps={{
										readOnly: true,
									}}
								/>
							</Grid>
							<Grid item xs={4}>
								<TextField
									margin="dense"
									label="Resubmission Factor"
									type="number"
									fullWidth
									variant="standard"
									value={instance?.resub_factor ?? -10.0}
									InputProps={{
										readOnly: true,
									}}
								/>
							</Grid>
						</Grid>
					</Box>
					<Box sx={{ mx: -1 }}>
						<Grid container spacing={2}>
							<Grid item xs={12}>
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
						<AccordionBoard title="Board">
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
				<Button onClick={close}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { QuestionDialog, QuestionDataDialog };
