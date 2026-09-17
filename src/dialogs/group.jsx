import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import {
	apiGroupAddMembers,
	apiGroupCandidates,
	apiGroupMembers,
	apiGroupRemoveMember,
} from "../api/group";

/** Create / rename a group (superadmin). */
const GroupDialog = ({ open, instance, close, save, handleChange }) => {
	const { formatMessage: tr } = useIntl();
	return (
		<Dialog open={open} onClose={close}>
			<DialogTitle>
				{instance?.id ? tr({ id: "group.edit" }) : tr({ id: "group.create" })}
			</DialogTitle>
			<form>
				<DialogContent sx={{ minWidth: 420 }}>
					<TextField
						margin="dense"
						label={tr({ id: "name" })}
						type="text"
						fullWidth
						variant="standard"
						autoFocus
						value={instance?.name || ""}
						onChange={(evt) => handleChange({ name: evt.target.value })}
					/>
					<TextField
						margin="dense"
						label={tr({ id: "description" })}
						type="text"
						fullWidth
						variant="standard"
						value={instance?.description || ""}
						onChange={(evt) => handleChange({ description: evt.target.value })}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
					<Button onClick={save} disabled={!instance?.name?.trim()}>
						{tr({ id: "Save" })}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

/**
 * Membership of one group: who is in it, and pulling accounts in / dropping
 * them out. Used by the superadmin (any group, any account) and by that
 * group's manager (its own group; only UNGROUPED accounts are offered to it,
 * and it cannot drop itself -- the backend enforces both).
 */
const GroupMembersDialog = ({ open, group, close, selfId = null, onChanged }) => {
	const { formatMessage: tr } = useIntl();
	const [members, setMembers] = useState([]);
	const [candidates, setCandidates] = useState([]);
	const [toAdd, setToAdd] = useState([]);
	const [busy, setBusy] = useState(false);
	// Prefix helper: accounts are named "UET.XLD", "HCMUE 1", "haui_1"... so a
	// school can usually be picked by typing its prefix once. Matches the start
	// of the name OR the account, case-insensitively; never applied on its own.
	const [prefix, setPrefix] = useState("");
	const matchesPrefix = (t) => {
		const p = prefix.trim().toLowerCase();
		if (!p) return false;
		return (
			String(t.name || "").toLowerCase().startsWith(p) ||
			String(t.account || "").toLowerCase().startsWith(p)
		);
	};
	const prefixMatches = candidates.filter(matchesPrefix);

	const reload = async () => {
		if (!group?.id) return;
		setBusy(true);
		const [m, c] = await Promise.all([
			apiGroupMembers(group.id),
			apiGroupCandidates(group.id),
		]);
		setMembers(m);
		setCandidates(c);
		setBusy(false);
	};

	useEffect(() => {
		if (open) {
			setToAdd([]);
			setPrefix("");
			reload();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, group?.id]);

	const handleAdd = async () => {
		if (!toAdd.length) return;
		const result = await apiGroupAddMembers(
			group.id,
			toAdd.map((t) => t.id),
		);
		if (result) {
			setToAdd([]);
			await reload();
			onChanged?.();
		}
	};

	const handleRemove = async (member) => {
		const result = await apiGroupRemoveMember(group.id, member.id);
		if (result) {
			await reload();
			onChanged?.();
		}
	};

	return (
		<Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
			<DialogTitle>
				{tr({ id: "group.members" })} - {group?.name}
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<Box>
						<Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
							{tr({ id: "group.addAccounts" })}
						</Typography>
						<Autocomplete
							multiple
							disableCloseOnSelect
							options={candidates}
							value={toAdd}
							getOptionLabel={(option) => option.name}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							renderOption={(props, option, { selected }) => {
								const { key, ...optionProps } = props;
								return (
									<Box key={key} {...optionProps}>
										<Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
										<Box>
											<Typography variant="body2">{option.name}</Typography>
											<Typography variant="caption" color="text.secondary">
												{option.account}
												{option.group_id != null && ` - ${tr({ id: "group.inAnotherGroup" })}`}
											</Typography>
										</Box>
									</Box>
								);
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder={tr({ id: "group.pickAccounts" })}
									variant="outlined"
									size="small"
								/>
							)}
							onChange={(_, values) => setToAdd(values)}
						/>
						<Typography variant="caption" color="text.secondary">
							{tr({ id: "group.candidatesHint" })}
						</Typography>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
							<TextField
								size="small"
								label={tr({ id: "group.prefix" })}
								placeholder="UET."
								value={prefix}
								onChange={(evt) => setPrefix(evt.target.value)}
								sx={{ width: 180 }}
							/>
							<Button
								size="small"
								variant="outlined"
								disabled={!prefixMatches.length}
								onClick={() => {
									const have = new Set(toAdd.map((t) => t.id));
									setToAdd([...toAdd, ...prefixMatches.filter((t) => !have.has(t.id))]);
								}}>
								{tr({ id: "group.selectPrefix" }, { count: prefixMatches.length })}
							</Button>
						</Stack>
						{toAdd.length > 0 && (
							<Box>
								<Button sx={{ mt: 1 }} variant="contained" size="small" onClick={handleAdd}>
									{tr({ id: "Add" })} ({toAdd.length})
								</Button>
							</Box>
						)}
					</Box>
					<Divider />
					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							{tr({ id: "group.currentMembers" })} ({members.length})
						</Typography>
						{!busy && members.length === 0 && (
							<Alert severity="info">{tr({ id: "group.noMembers" })}</Alert>
						)}
						<List dense disablePadding>
							{members.map((member) => {
								const isSelf = selfId != null && Number(member.id) === Number(selfId);
								return (
									<ListItem
										key={member.id}
										disableGutters
										secondaryAction={
											<Tooltip
												title={
													isSelf
														? tr({ id: "group.cannotRemoveSelf" })
														: tr({ id: "group.removeAccount" })
												}>
												<span>
													<IconButton
														edge="end"
														size="small"
														color="error"
														disabled={isSelf}
														onClick={() => handleRemove(member)}>
														<PersonRemoveIcon fontSize="small" />
													</IconButton>
												</span>
											</Tooltip>
										}>
										<ListItemText
											primary={
												<Stack direction="row" spacing={1} alignItems="center">
													<span>{member.name}</span>
													{member.group_role === "manager" && (
														<Chip size="small" color="secondary" label={tr({ id: "role.manager" })} />
													)}
												</Stack>
											}
											secondary={member.account}
										/>
									</ListItem>
								);
							})}
						</List>
					</Box>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>{tr({ id: "Close" })}</Button>
			</DialogActions>
		</Dialog>
	);
};

export { GroupDialog, GroupMembersDialog };
