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
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { UserCircle as UserCircleIcon } from "../icons/user-circle";
import { useContext } from "react";
import { useIntl } from "react-intl";
import { Box } from "@mui/system";
import { api, showMessage } from "../api/commons";
import Context from "../context";
import LanguageTrans from "./language-trans";
import Logo from "./logo";
import Breadcrumb from "./breadcrumb";

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

const SERVICE_API = process.env.REACT_APP_SERVICE_API;

export const DashboardNavbar = (props) => {
  const { onSidebarOpen, isSidebarOpen, ...other } = props;
  const { team, updateLocalStorage } = useContext(Context);
  const { formatMessage: tr } = useIntl();

  const handleCheckTime = async () => {
    const res = await api.get(`${SERVICE_API}/question/time`);
    showMessage(`Time: ${new Date() - new Date(res.time)} ms`, "success", 2000);
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
            <Tooltip title="Time">
              <IconButton sx={{ ml: 3 }} onClick={handleCheckTime}>
                <AccessTimeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton
                onClick={() => {
                  navigate("/");
                }}
              >
                <RefreshIcon />
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
    </>
  );
};

DashboardNavbar.propTypes = {
  onSidebarOpen: PropTypes.func,
};
