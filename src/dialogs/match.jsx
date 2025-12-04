import {
	Dialog,
	DialogTitle,
	DialogContent,
	TextField,
	DialogActions,
	Button,
	Stack,
	Switch,
	FormControlLabel,
	Autocomplete,
	Checkbox,
	Box,
	Typography,
	Divider,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { DateTimePicker } from "@mui/x-date-pickers";
const useStyles = makeStyles({
	root: {
		// overflow: "visible",
	},
});
const MatchDialog = ({ open, instance, close, save, handleChange }) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();

	// Convert string dates to Date objects if needed
	const startTime = instance?.start_time ? new Date(instance.start_time) : null;
	const endTime = instance?.end_time ? new Date(instance.end_time) : null;

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>{instance?.id ? "Edit Match" : "Create Match"}</DialogTitle>
			<form>
				<DialogContent className={classes.root} sx={{ width: 500 }}>
					<Stack spacing={3}>
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
						<TextField
							margin="dense"
							label="Description"
							type="text"
							fullWidth
							variant="standard"
							name="account"
							value={instance?.description}
							onChange={(evt) => {
								handleChange({ description: evt.target.value });
							}}
						/>
						<DateTimePicker
							label="Start Time"
							value={startTime}
							onChange={(newValue) => {
								handleChange({ start_time: newValue });
							}}
							slotProps={{
								textField: {
									variant: "standard",
									fullWidth: true,
								},
							}}
						/>
						<DateTimePicker
							label="End Time"
							value={endTime}
							onChange={(newValue) => {
								handleChange({ end_time: newValue });
							}}
							slotProps={{
								textField: {
									variant: "standard",
									fullWidth: true,
								},
							}}
						/>
						<FormControlLabel
							sx={{ flexDirection: "row" }}
							control={
								<Switch
									checked={instance?.is_active}
									onChange={(evt) => {
										handleChange({ is_active: evt.target.checked });
									}}
								/>
							}
							label="Active"
							labelPlacement="start"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
					<Button onClick={save}>{tr({ id: "Save" })}</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

const TeamMatchDialog = ({ open, teams, close, handleDelete }) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();
	const [selectedTeams, setSelectedTeams] = useState([]);

	const handleSelect = (e, team) => {
		if (e.target.checked) setSelectedTeams([...selectedTeams, team]);
		else {
			const rmIdx = selectedTeams.findIndex((item) => item.id === team.id);
			selectedTeams.splice(rmIdx, 1);
			setSelectedTeams([...selectedTeams]);
		}
	};

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>{tr({ id: "Teams" })}</DialogTitle>
			<form>
				<DialogContent className={classes.root} sx={{ width: 500 }}>
					<Stack spacing={1}>
						{teams?.map((item) => {
							return (
								<div key={item.id}>
									<FormControlLabel
										control={<Checkbox />}
										onChange={(e) => handleSelect(e, item)}
										label={item.name}
									/>
								</div>
							);
						})}
					</Stack>
				</DialogContent>
				<DialogActions>
					{!!selectedTeams.length && (
						<Button
							color="error"
							startIcon={<DeleteIcon />}
							onClick={() => handleDelete(selectedTeams)}>
							{tr({ id: "Remove" })}
						</Button>
					)}
					<Button onClick={close}>{tr({ id: "Close" })}</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

const AddTeamMatchDialog = ({ open, close, teams, handleAdd }) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();
	const { data: allTeams } = useFetchData({ path: "/team", name: "Team" });
	const [selectedTeams, setSelectedTeams] = useState([]);

	const filterTeams = allTeams.filter(
		(item) => !teams.find((team) => team.id === item.id)
	);

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>{tr({ id: "Add Team" })}</DialogTitle>
			<form>
				<DialogContent className={classes.root} sx={{ width: 500 }}>
					<Autocomplete
						multiple
						disableCloseOnSelect
						options={filterTeams}
						getOptionLabel={(option) => option.name}
						isOptionEqualToValue={(option, value) => option.id === value.id}
						renderOption={(props, option, { selected }) => {
							const { key, ...optionProps } = props;
							return (
								<Box key={key} {...optionProps}>
									<Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
									{option.name}
								</Box>
							);
						}}
						renderInput={(params) => (
							<TextField {...params} label="Team" variant="standard" />
						)}
						onChange={(_, values) => setSelectedTeams(values)}
					/>
				</DialogContent>
			</form>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
				<Button
					disabled={!selectedTeams.length}
					onClick={() => handleAdd(selectedTeams)}>
					{tr({ id: "Save" })}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

const ManageTeamMatchDialog = ({
	open,
	close,
	teams = [],
	handleAdd,
	handleDelete,
	isBulkMode = false,
	handleDeleteAll,
}) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();
	const { data: allTeams } = useFetchData({ path: "/team", name: "Team" });
	const [selectedTeamsToAdd, setSelectedTeamsToAdd] = useState([]);
	const [selectedTeamsToRemove, setSelectedTeamsToRemove] = useState([]);

	const availableTeams = allTeams.filter(
		(item) => !teams?.find((team) => team.id === item.id)
	);

	const handleAddTeams = async () => {
		if (selectedTeamsToAdd.length > 0) {
			await handleAdd(selectedTeamsToAdd);
			setSelectedTeamsToAdd([]);
		}
	};

	const handleRemoveTeams = async () => {
		if (selectedTeamsToRemove.length > 0) {
			await handleDelete(selectedTeamsToRemove);
			setSelectedTeamsToRemove([]);
		}
	};

	const handleClose = () => {
		setSelectedTeamsToAdd([]);
		setSelectedTeamsToRemove([]);
		close();
	};

	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={handleClose}
			maxWidth="sm"
			fullWidth>
			<DialogTitle>{tr({ id: "Manage Teams" })}</DialogTitle>
			<DialogContent className={classes.root}>
				<Stack spacing={3} sx={{ mt: 1 }}>
					{/* Add Teams Section */}
					<Box>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							sx={{ mb: 1 }}>
							<Typography variant="subtitle2" color="primary">
								➕ {tr({ id: "Add Teams" })}:
							</Typography>
							<Stack direction="row" spacing={1}>
								{selectedTeamsToAdd.length < availableTeams.length &&
									availableTeams.length > 0 && (
										<Button
											size="small"
											variant="outlined"
											onClick={() => setSelectedTeamsToAdd(availableTeams)}>
											Select All ({availableTeams.length})
										</Button>
									)}
								{selectedTeamsToAdd.length > 0 && (
									<Button
										size="small"
										variant="outlined"
										color="secondary"
										onClick={() => setSelectedTeamsToAdd([])}>
										Deselect All
									</Button>
								)}
							</Stack>
						</Stack>
						<Autocomplete
							multiple
							disableCloseOnSelect
							options={availableTeams}
							value={selectedTeamsToAdd}
							getOptionLabel={(option) => option.name}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							renderOption={(props, option, { selected }) => {
								const { key, ...optionProps } = props;
								return (
									<Box key={key} {...optionProps}>
										<Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
										{option.name}
									</Box>
								);
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder="Select teams to add"
									variant="outlined"
									size="small"
								/>
							)}
							onChange={(_, values) => setSelectedTeamsToAdd(values)}
						/>
						{selectedTeamsToAdd.length > 0 && (
							<Button
								sx={{ mt: 1 }}
								variant="contained"
								color="primary"
								size="small"
								onClick={handleAddTeams}>
								{tr({ id: "Add" })} ({selectedTeamsToAdd.length})
							</Button>
						)}
					</Box>

					{/* Remove Teams Section */}
					{teams && teams.length > 0 && (
						<>
							<Divider />
							<Box>
								<Stack
									direction="row"
									justifyContent="space-between"
									alignItems="center"
									sx={{ mb: 1 }}>
									<Typography variant="subtitle2" color="error">
										➖ {tr({ id: "Remove Teams" })}:
									</Typography>
									<Stack direction="row" spacing={1}>
										{selectedTeamsToRemove.length < teams.length && (
											<Button
												size="small"
												variant="outlined"
												color="error"
												onClick={() => setSelectedTeamsToRemove(teams)}>
												Select All ({teams.length})
											</Button>
										)}
										{selectedTeamsToRemove.length > 0 && (
											<Button
												size="small"
												variant="outlined"
												color="secondary"
												onClick={() => setSelectedTeamsToRemove([])}>
												Deselect All
											</Button>
										)}
									</Stack>
								</Stack>
								<Autocomplete
									multiple
									disableCloseOnSelect
									options={teams}
									value={selectedTeamsToRemove}
									getOptionLabel={(option) => option.name}
									isOptionEqualToValue={(option, value) =>
										option.id === value.id
									}
									renderOption={(props, option, { selected }) => {
										const { key, ...optionProps } = props;
										return (
											<Box key={key} {...optionProps}>
												<Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
												{option.name}
											</Box>
										);
									}}
									renderInput={(params) => (
										<TextField
											{...params}
											placeholder="Select teams to remove"
											variant="outlined"
											size="small"
										/>
									)}
									onChange={(_, values) => setSelectedTeamsToRemove(values)}
								/>
								{selectedTeamsToRemove.length > 0 && (
									<Button
										sx={{ mt: 1 }}
										variant="contained"
										color="error"
										size="small"
										startIcon={<DeleteIcon />}
										onClick={handleRemoveTeams}>
										{tr({ id: "Remove" })} ({selectedTeamsToRemove.length})
									</Button>
								)}
							</Box>
						</>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>{tr({ id: "Close" })}</Button>
				{isBulkMode && (
					<Button
						onClick={handleDeleteAll}
						color="error"
						variant="contained"
						startIcon={<DeleteIcon />}>
						{tr({ id: "Delete All Teams" })}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
};

export {
	MatchDialog,
	AddTeamMatchDialog,
	TeamMatchDialog,
	ManageTeamMatchDialog,
};
