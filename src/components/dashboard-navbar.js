import PropTypes from "prop-types";
import styled from "@emotion/styled";
import {
  AppBar,
  Avatar,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { UserCircle as UserCircleIcon } from "../icons/user-circle";
import LogoutIcon from "@mui/icons-material/MeetingRoom";
import { useContext } from "react";
import Context from "../context";
import { useIntl } from "react-intl";
import LanguageTrans from "./language-trans";
import Logo from "./logo";
import Breadcrumb from "./breadcrumb";
import { Box } from "@mui/system";

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

export const DashboardNavbar = (props) => {
  const { onSidebarOpen, isSidebarOpen, ...other } = props;
  const { team, updateLocalStorage } = useContext(Context);
  const { formatMessage: tr } = useIntl();

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
            <Tooltip title="Search">
              <IconButton sx={{ ml: 1 }}>
                <SearchIcon fontSize="small" />
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
