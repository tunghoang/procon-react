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
import { isPlayerAccount } from "../utils/roles";
import { useState } from "react";

const BulkAddTeamsToRoundDialog = ({
	open,
	close,
	roundName,
	matches = [],
	loading = false,
	handleAdd,
	handleRemove,
	// The group every match in this round belongs to, or null when they are all
	// ungrouped. The caller refuses to open the dialog for a round whose
	// matches MIX groups (there is no roster that would be valid for all of
	// them), so a single id is enough here.
	groupId = null,
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

	// Same two rules as the per-match dialog: a group match only takes that
	// group's members, and STAFF accounts can never be rostered (the backend
	// filters them out of a bulk add and names them in `skipped_staff`), so
	// neither belongs in the picker.
	const availableTeams = allTeams.filter(
		(team) =>
			isPlayerAccount(team) &&
			!teamsInAllMatches.find((t) => t.id === team.id) &&
			(groupId == null || Number(team.group_id) === Number(groupId))
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
								{/* The ONLY rich-text message in the app: `roundTeams.intro`
								    carries a <b> tag, so it must be formatted by a
								    component's own `useIntl()` (which can build React
								    elements) and never by the standalone `t()` helper in
								    src/i18n.js -- that one returns a plain string. */}
								{tr(
									{ id: "roundTeams.intro" },
									{
										count: matches.length,
										b: (chunks) => <strong key="n">{chunks}</strong>,
									},
								)}
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
												label={`${match.name} (${tr(
													{ id: "match.teamCount" },
													{ count: match.teams?.length || 0 },
												)})`}
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
									➕ {tr({ id: "roundTeams.addToAll" })}
								</Typography>
								<Stack direction="row" spacing={1}>
									{selectedTeamsToAdd.length < availableTeams.length &&
										availableTeams.length > 0 && (
											<Button
												size="small"
												variant="outlined"
												onClick={() => setSelectedTeamsToAdd(availableTeams)}>
												{tr({ id: "selectAll" }, { count: availableTeams.length })}
											</Button>
										)}
									{selectedTeamsToAdd.length > 0 && (
										<Button
											size="small"
											variant="outlined"
											color="secondary"
											onClick={() => setSelectedTeamsToAdd([])}>
											{tr({ id: "deselectAll" })}
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
														{tr(
															{ id: "roundTeams.alreadyIn" },
															{ count: matchCount, total: matches.length },
														)}
													</Typography>
												)}
											</Box>
										</Box>
									);
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										placeholder={tr({ id: "roundTeams.pickToAdd" })}
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
											➖ {tr({ id: "roundTeams.removeFromAll" })}
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
													{tr({ id: "selectAll" }, { count: teamsInAnyMatch.length })}
												</Button>
											)}
											{selectedTeamsToRemove.length > 0 && (
												<Button
													size="small"
													variant="outlined"
													color="secondary"
													onClick={() => setSelectedTeamsToRemove([])}>
													{tr({ id: "deselectAll" })}
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
															{tr(
																{ id: "roundTeams.inMatches" },
																{ count: matchCount, total: matches.length },
															)}
															{isInAll && " ✓"}
														</Typography>
													</Box>
												</Box>
											);
										}}
										renderInput={(params) => (
											<TextField
												{...params}
												placeholder={tr({ id: "roundTeams.pickToRemove" })}
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
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { BulkAddTeamsToRoundDialog };
