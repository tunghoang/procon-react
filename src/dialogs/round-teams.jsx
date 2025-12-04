import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Autocomplete,
	Box,
	Typography,
	Chip,
	Stack,
	Checkbox,
	CircularProgress,
	Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";
import { useState } from "react";

const BulkAddTeamsToRoundDialog = ({
	open,
	close,
	roundName,
	matches = [],
	loading = false,
	handleAdd,
	handleRemove,
}) => {
	const { formatMessage: tr } = useIntl();
	const { data: allTeams } = useFetchData({ path: "/team", name: "Team" });
	const [selectedTeamsToAdd, setSelectedTeamsToAdd] = useState([]);
	const [selectedTeamsToRemove, setSelectedTeamsToRemove] = useState([]);

	// Get all unique teams already in at least one match
	const teamsInAnyMatch = allTeams.filter((team) => {
		return matches.some((match) => match.teams?.some((t) => t.id === team.id));
	});

	// Filter out teams that are already in ALL matches
	const teamsInAllMatches = allTeams.filter((team) => {
		return matches.every((match) => match.teams?.some((t) => t.id === team.id));
	});

	const availableTeams = allTeams.filter(
		(team) => !teamsInAllMatches.find((t) => t.id === team.id)
	);

	const handleAddTeams = async () => {
		if (selectedTeamsToAdd.length > 0) {
			await handleAdd(selectedTeamsToAdd);
			setSelectedTeamsToAdd([]);
		}
	};

	const handleRemoveTeams = async () => {
		if (selectedTeamsToRemove.length > 0) {
			await handleRemove(selectedTeamsToRemove);
			setSelectedTeamsToRemove([]);
		}
	};

	const handleClose = () => {
		setSelectedTeamsToAdd([]);
		setSelectedTeamsToRemove([]);
		close();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				{tr({ id: "Manage Teams" })} - {roundName}
			</DialogTitle>
			<DialogContent>
				{loading ? (
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							py: 4,
						}}>
						<CircularProgress />
					</Box>
				) : (
					<Stack spacing={3} sx={{ mt: 1 }}>
						{/* Info about matches */}
						<Box>
							<Typography variant="body2" color="text.secondary">
								Round này có <strong>{matches.length}</strong> match(es). Teams
								được chọn sẽ được thêm vào tất cả các matches.
							</Typography>
							{matches.length > 0 && (
								<Box sx={{ mt: 1 }}>
									<Stack
										direction="row"
										spacing={0.5}
										flexWrap="wrap"
										useFlexGap>
										{matches.map((match) => (
											<Chip
												key={match.id}
												label={`${match.name} (${
													match.teams?.length || 0
												} teams)`}
												size="small"
												variant="outlined"
												sx={{ mb: 0.5 }}
											/>
										))}
									</Stack>
								</Box>
							)}
						</Box>

						{/* Add Teams Section */}
						<Box>
							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="center"
								sx={{ mb: 1 }}>
								<Typography variant="subtitle2" color="primary">
									➕ Thêm teams vào tất cả matches:
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
									// Check how many matches this team is already in
									const matchCount = matches.filter((m) =>
										m.teams?.some((t) => t.id === option.id)
									).length;
									return (
										<Box key={key} {...optionProps}>
											<Checkbox
												size="small"
												sx={{ mr: 1 }}
												checked={selected}
											/>
											<Box>
												<Typography variant="body2">{option.name}</Typography>
												{matchCount > 0 && (
													<Typography variant="caption" color="text.secondary">
														Đã có trong {matchCount}/{matches.length} matches
													</Typography>
												)}
											</Box>
										</Box>
									);
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										placeholder="Chọn teams để thêm..."
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
									{tr({ id: "Add" })} ({selectedTeamsToAdd.length}) teams
								</Button>
							)}
						</Box>

						{/* Remove Teams Section */}
						{teamsInAnyMatch.length > 0 && (
							<>
								<Divider />
								<Box>
									<Stack
										direction="row"
										justifyContent="space-between"
										alignItems="center"
										sx={{ mb: 1 }}>
										<Typography variant="subtitle2" color="error">
											➖ Xóa teams khỏi tất cả matches:
										</Typography>
										<Stack direction="row" spacing={1}>
											{selectedTeamsToRemove.length <
												teamsInAnyMatch.length && (
												<Button
													size="small"
													variant="outlined"
													color="error"
													onClick={() =>
														setSelectedTeamsToRemove(teamsInAnyMatch)
													}>
													Select All ({teamsInAnyMatch.length})
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
										options={teamsInAnyMatch}
										value={selectedTeamsToRemove}
										getOptionLabel={(option) => option.name}
										isOptionEqualToValue={(option, value) =>
											option.id === value.id
										}
										renderOption={(props, option, { selected }) => {
											const { key, ...optionProps } = props;
											const matchCount = matches.filter((m) =>
												m.teams?.some((t) => t.id === option.id)
											).length;
											const isInAll = matchCount === matches.length;
											return (
												<Box key={key} {...optionProps}>
													<Checkbox
														size="small"
														sx={{ mr: 1 }}
														checked={selected}
													/>
													<Box>
														<Typography variant="body2">
															{option.name}
														</Typography>
														<Typography
															variant="caption"
															color={
																isInAll ? "success.main" : "text.secondary"
															}>
															Có trong {matchCount}/{matches.length} matches
															{isInAll && " ✓"}
														</Typography>
													</Box>
												</Box>
											);
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder="Chọn teams để xóa..."
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
											teams
										</Button>
									)}
								</Box>
							</>
						)}
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { BulkAddTeamsToRoundDialog };
