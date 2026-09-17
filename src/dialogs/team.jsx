import {
	Dialog,
	DialogTitle,
	DialogContent,
	TextField,
	DialogActions,
	Button,
	Select,
	MenuItem,
	InputLabel,
	FormControl,
	FormHelperText,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useIntl } from "react-intl";
import { useFetchData } from "../api";

const useStyles = makeStyles({
	root: {
		// overflow: "visible",
	},
});

// The role select folds the two backend fields into one choice:
//   user     is_admin=false, group_role=member
//   manager  is_admin=false, group_role=manager  (needs a group)
//   admin    is_admin=true  (superadmin; group is irrelevant)
const roleOf = (instance) => {
	if (instance?.is_admin) return "admin";
	if (instance?.group_role === "manager") return "manager";
	return "user";
};

/** Create / edit an account -- superadmin only. */
const TeamDialog = ({ open, instance, close, save, handleChange }) => {
	const classes = useStyles();
	const { formatMessage: tr } = useIntl();
	const { data: groups } = useFetchData({ path: "/group", name: "Group", isFetch: open });
	const role = roleOf(instance);
	const managerWithoutGroup = role === "manager" && !instance?.group_id;
	return (
		<Dialog
			classes={{ paperScrollPaper: classes.root }}
			open={open}
			onClose={close}>
			<DialogTitle>
				{(instance || {}).id ? "Edit Team" : "Create Team"}
			</DialogTitle>
			<form>
				<DialogContent className={classes.root}>
					<TextField
						margin="dense"
						label="Name"
						type="text"
						fullWidth
						variant="standard"
						name="name"
						value={(instance || {}).name}
						onChange={(evt) => {
							handleChange({ name: evt.target.value });
						}}
					/>
					<TextField
						margin="dense"
						label="Account"
						type="text"
						fullWidth
						variant="standard"
						disabled={!!(instance || {}).id}
						name="account"
						value={(instance || {}).account}
						onChange={(evt) => {
							handleChange({ account: evt.target.value });
						}}
					/>
					<FormControl
						variant="standard"
						sx={{ m: 0, minWidth: 120 }}
						fullWidth>
						<InputLabel id="role">Role</InputLabel>
						<Select
							labelId="role"
							label="Role"
							type="text"
							name="role"
							value={role}
							onChange={(evt) => {
								const next = evt.target.value;
								handleChange({
									is_admin: next === "admin",
									group_role: next === "manager" ? "manager" : "member",
								});
							}}>
							<MenuItem value="user">{tr({ id: "role.user" })}</MenuItem>
							<MenuItem value="manager">{tr({ id: "role.manager" })}</MenuItem>
							<MenuItem value="admin">{tr({ id: "role.admin" })}</MenuItem>
						</Select>
						<FormHelperText>{tr({ id: `role.help.${role}` })}</FormHelperText>
					</FormControl>
					{role !== "admin" && (
						<FormControl
							variant="standard"
							sx={{ m: 0, minWidth: 120 }}
							fullWidth
							error={managerWithoutGroup}>
							<InputLabel id="group">{tr({ id: "group.field" })}</InputLabel>
							<Select
								labelId="group"
								label={tr({ id: "group.field" })}
								name="group_id"
								value={(instance || {}).group_id ?? ""}
								onChange={(evt) => {
									handleChange({ group_id: evt.target.value === "" ? null : evt.target.value });
								}}>
								<MenuItem value="">{tr({ id: "group.none" })}</MenuItem>
								{(groups || []).map((g) => (
									<MenuItem key={g.id} value={g.id}>
										{g.name}
									</MenuItem>
								))}
							</Select>
							{managerWithoutGroup && (
								<FormHelperText>{tr({ id: "group.managerNeedsGroup" })}</FormHelperText>
							)}
						</FormControl>
					)}
					{!(instance || {}).id && (
						<TextField
							margin="dense"
							label="Password"
							type="password"
							fullWidth
							variant="standard"
							name="Password"
							autoComplete="on"
							value={instance.password}
							onChange={(evt) => {
								handleChange({ password: evt.target.value });
							}}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={close}>{tr({ id: "Cancel" })}</Button>
					<Button onClick={save} disabled={managerWithoutGroup}>
						{tr({ id: "Save" })}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default TeamDialog;
