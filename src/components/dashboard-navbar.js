import PropTypes from "prop-types";
import styled from "@emotion/styled";
import {
  AppBar,
  Avatar,
  Breadcrumbs,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { UserCircle as UserCircleIcon } from "../icons/user-circle";
import LogoutIcon from "@mui/icons-material/MeetingRoom";
import { useContext } from "react";
import Context from "../context";
import { useIntl } from "react-intl";
import { A } from "hookrouter";
import LanguageTrans from "./language-trans";

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));

export const DashboardNavbar = (props) => {
  const { onSidebarOpen, ...other } = props;
  const { teamname, updateLocalStorage, tournament, round } =
    useContext(Context);
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
          <Stack spacing={2} flexGrow={1}>
            <Breadcrumbs separator="›" aria-label="breadcrumb">
              <A
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
                href="/"
              >
                {tr({ id: "Tournaments" })}{" "}
                {tournament && !round && `(${tournament.name})`}
              </A>
              {tournament && (
                <A
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  href="/rounds"
                >
                  {tr({ id: "Rounds" })}
                </A>
              )}
              {tournament && round && (
                <Typography color="text.primary" fontWeight={"500"}>
                  {tournament.name}
                  {" & "} {round.name}
                </Typography>
              )}
            </Breadcrumbs>
          </Stack>
          <Stack direction={"row"} spacing={3} alignItems="center">
            <Tooltip title="Search">
              <IconButton sx={{ ml: 1 }}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <LanguageTrans />
            <Tooltip title={teamname}>
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
