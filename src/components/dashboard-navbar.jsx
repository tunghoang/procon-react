import PropTypes from "prop-types";
import styled from "@emotion/styled";
import {
	AppBar,
	Avatar,
	IconButton,
	Stack,
	Toolbar,
	Tooltip,
	Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/MeetingRoom";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import HttpsIcon from "@mui/icons-material/Https";

import { UserCircle as UserCircleIcon } from "../icons/user-circle";
import { useContext, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "@tanstack/react-router";
import { Box } from "@mui/system";
import { api, getError, showMessage } from "../api/commons";
import { copyText } from "../utils/commons";
import { SERVICE_API } from "../config/env";
import Context from "../context";
import LanguageTrans from "./language-trans";
import Logo from "./logo";
import Breadcrumb from "./breadcrumb";
import TeamPasswordDialog from "../dialogs/password";
import { isStaff } from "../utils/roles";

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
	backgroundColor: theme.palette.background.paper,
	boxShadow: theme.shadows[3],
}));

export const DashboardNavbar = (props) => {
	const { onSidebarOpen, onSidebarClose, isSidebarOpen, ...other } = props;
	const { team, updateLocalStorage } = useContext(Context);
	const { formatMessage: tr } = useIntl();
	const navigate = useNavigate();
	const [dialogName, setDialogName] = useState("");
	// `current_password` is required by PUT /team/password when an account
	// changes its OWN password.
	const [password, setPassword] = useState({
		current_password: "",
		password: "",
	});

	const handleCheckTime = async () => {
		try {
			const res = await api.get(`${SERVICE_API}/question/time`);
			showMessage(
				tr(
					{ id: "nav.pingResult" },
					{ ms: Math.abs(Date.now() - new Date(res.time)) },
				),
				"success",
				2000,
			);
		} catch (e) {
			showMessage(getError(e), "error");
		}
	};

	const emptyPassword = { current_password: "", password: "" };

	const closeDialog = () => {
		setPassword(emptyPassword);
		setDialogName("");
	};

	const savePassword = async () => {
		try {
			// Exactly {current_password, password}: the endpoint verifies the
			// current one before writing the new hash.
			await api.put(`${SERVICE_API}/team/password`, {
				current_password: password.current_password,
				password: password.password,
			});
			showMessage(tr({ id: "password.changed" }), "success", 2000);
			setPassword(emptyPassword);
			setDialogName("");
		} catch (e) {
			// Keep the dialog open on a wrong current password so the user can
			// retype it instead of reopening and starting over.
			showMessage(getError(e), "error");
		}
	};

	const changePassword = (changes) => {
		setPassword((prev) => ({ ...prev, ...changes }));
	};

	const toggleSidebar = () => {
		if (isSidebarOpen) {
			onSidebarClose?.();
		} else {
			onSidebarOpen?.();
		}
	};

	return (
		<>
			<DashboardNavbarRoot
				position="sticky"
				sx={{
					top: 0,
					zIndex: 1100,
				}}
				{...other}>
				<Toolbar
					disableGutters
					sx={{
						minHeight: 64,
						left: 0,
						px: 2,
					}}>
					<IconButton
						aria-label={tr({ id: "nav.menu" })}
						onClick={toggleSidebar}>
						<MenuIcon fontSize="small" />
					</IconButton>
					<Stack direction={"row"} flexGrow={1} alignItems="center" spacing={2}>
						{!isSidebarOpen && <Logo sx={{ color: "#000" }} />}
						<Breadcrumb />
					</Stack>
					<Stack direction={"row"} spacing={3} alignItems="center">
						<Tooltip title={tr({ id: "nav.ping" })}>
							<IconButton
								sx={{ ml: 3 }}
								aria-label={tr({ id: "nav.ping" })}
								onClick={handleCheckTime}>
								<AccessTimeIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title={tr({ id: "nav.copyToken" })}>
							<IconButton
								aria-label={tr({ id: "nav.copyToken" })}
								onClick={() => {
									// navigator.clipboard.writeText requires a secure context
									// (HTTPS/localhost) and silently fails to copy anything
									// useful over plain HTTP -- go straight to a manual-copy
									// prompt instead of a clipboard call that may or may not
									// actually work.
									const token = localStorage.getItem("token");
									window.prompt(tr({ id: "nav.copyTokenPrompt" }), token || "");
								}}>
								<VpnKeyIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title={tr({ id: "nav.competition" })}>
							<IconButton
								aria-label={tr({ id: "nav.competition" })}
								onClick={() => navigate({ to: "/competition" })}>
								<SportsMmaIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title={tr({ id: "nav.changePassword" })}>
							<IconButton
								aria-label={tr({ id: "nav.changePassword" })}
								onClick={() => setDialogName("TeamPasswordDialog")}>
								<HttpsIcon />
							</IconButton>
						</Tooltip>
						{isStaff(team) && (
							<Tooltip title={tr({ id: "nav.adminArea" })}>
								<IconButton
									aria-label={tr({ id: "nav.adminArea" })}
									onClick={() => navigate({ to: "/tournament" })}
									color="error">
									<AdminPanelSettingsIcon />
								</IconButton>
							</Tooltip>
						)}
						<LanguageTrans />
						<Stack alignItems="center" spacing={0.25}>
							<Tooltip title={team?.name || ""}>
								<Avatar
									style={{ cursor: "pointer" }}
									sx={{
										height: 40,
										width: 40,
									}}
									src={
										isStaff(team)
											? "/static/images/avatars/gigachad.png"
											: "/static/images/avatars/avatar_1.png"
									}>
									<UserCircleIcon fontSize="small" />
								</Avatar>
							</Tooltip>
							{team?.id != null && (
								<Tooltip title={tr({ id: "nav.copyUserId" })}>
									<Typography
										variant="caption"
										color="textSecondary"
										onClick={async () => {
											if (await copyText(String(team.id))) {
												showMessage(tr({ id: "nav.copiedUserId" }), "success", 2000);
											}
										}}
										sx={{ lineHeight: 1, cursor: "pointer", userSelect: "all" }}>
										ID: {team.id}
									</Typography>
								</Tooltip>
							)}
						</Stack>
						<Tooltip title={tr({ id: "Sign Out" })}>
							<IconButton
								sx={{ ml: 1 }}
								aria-label={tr({ id: "Sign Out" })}
								onClick={() => {
									updateLocalStorage({ token: null });
									navigate({ to: "/login" });
								}}>
								<LogoutIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Stack>
				</Toolbar>
			</DashboardNavbarRoot>
			<TeamPasswordDialog
				open={dialogName === "TeamPasswordDialog"}
				instance={password}
				close={closeDialog}
				save={savePassword}
				handleChange={changePassword}
				requireCurrent
			/>
		</>
	);
};

DashboardNavbar.propTypes = {
	onSidebarOpen: PropTypes.func,
	onSidebarClose: PropTypes.func,
	isSidebarOpen: PropTypes.bool,
};
