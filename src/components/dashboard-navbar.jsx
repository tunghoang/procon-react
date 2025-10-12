import PropTypes from "prop-types";
import styled from "@emotion/styled";
import { navigate } from "hookrouter";
import {
  AppBar,
  Avatar,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
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
import { Box } from "@mui/system";
import { api, getError, showMessage } from "../api/commons";
import Context from "../context";
import LanguageTrans from "./language-trans";
import Logo from "./logo";
import Breadcrumb from "./breadcrumb";
import TeamPasswordDialog from "../dialogs/password";

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

const SERVICE_API = import.meta.env.VITE_SERVICE_API;

export const DashboardNavbar = (props) => {
  const { onSidebarOpen, isSidebarOpen, ...other } = props;
  const { team, updateLocalStorage } = useContext(Context);
  const { formatMessage: tr } = useIntl();
  const [dialogName, setDialogName] = useState("");
  const [password, setPassword] = useState({ password: "" });

  const handleCheckTime = async () => {
    try {
      const res = await api.get(`${SERVICE_API}/question/time`);
      showMessage(
        `Ping: ${Math.abs(Date.now() - new Date(res.time))} ms`,
        "success",
        2000
      );
    } catch (e) {
      showMessage(getError(e), "error");
    }
  };

  const closeDialog = () => {
    setPassword({ password: "" });
    setDialogName("");
  };

  const savePassword = async () => {
    try {
      await api.put(`${SERVICE_API}/team/password`, password);
      showMessage("Changed password successfully", "success", 2000);
    } catch (e) {
      showMessage(getError(e), "error");
    } finally {
      setPassword({ password: "" });
      setDialogName("");
    }
  };

  const changePassword = (password) => {
    setPassword(password);
  };

  return (
    <>
      <DashboardNavbarRoot
        sx={{
          left: {
            lg: 280,
          },
          width: {
            lg: "calc(100% - 280px)",
          },
        }}
        {...other}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: 64,
            left: 0,
            px: 2,
          }}
        >
          <IconButton
            onClick={onSidebarOpen}
            sx={{
              display: {
                xs: "inline-flex",
                lg: "none",
              },
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
          <Stack direction={"row"} flexGrow={1} alignItems="center" spacing={2}>
            <Box
              sx={{
                display: {
                  xs: "none",
                  lg: isSidebarOpen ? "none" : "inline-flex",
                },
              }}
            >
              <Logo sx={{ color: "#000" }} />
            </Box>
            <Breadcrumb />
          </Stack>
          <Stack direction={"row"} spacing={3} alignItems="center">
            <Tooltip title="Ping">
              <IconButton sx={{ ml: 3 }} onClick={handleCheckTime}>
                <AccessTimeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Token">
              <IconButton
                onClick={() => {
                  const token = localStorage.getItem("token");
                  navigator.clipboard.writeText(token);
                  showMessage("Copied token to clipboard!", "success", 2000);
                }}
              >
                <VpnKeyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Competition">
              <IconButton onClick={() => navigate("/competition")}>
                <SportsMmaIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Admin Only">
              <IconButton onClick={() => navigate("/")}>
                <AdminPanelSettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Password">
              <IconButton onClick={() => setDialogName("TeamPasswordDialog")}>
                <HttpsIcon />
              </IconButton>
            </Tooltip>
            <LanguageTrans />
            <Tooltip title={team?.name || ""}>
              <Avatar
                style={{ cursor: "pointer" }}
                sx={{
                  height: 40,
                  width: 40,
                }}
                src="/static/images/avatars/avatar_1.png"
              >
                <UserCircleIcon fontSize="small" />
              </Avatar>
            </Tooltip>
            <Tooltip title={tr({ id: "Sign Out" })}>
              <IconButton
                sx={{ ml: 1 }}
                onClick={() => updateLocalStorage({ token: null })}
              >
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
      />
    </>
  );
};

DashboardNavbar.propTypes = {
  onSidebarOpen: PropTypes.func,
};
