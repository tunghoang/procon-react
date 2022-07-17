import PropTypes from "prop-types";
import {
  Box,
  Drawer,
  Divider,
  Typography,
  useMediaQuery,
  Stack,
} from "@mui/material";
import { Logo } from "./logo";
import { NavItem } from "./nav-item";

import { A } from "hookrouter";
import { Laboratory as LaboratoryIcon } from "../icons/laboratory";
import { Book as BookIcon } from "../icons/book";
import { Child as ChildIcon } from "../icons/child";
import { Education as EducationIcon } from "../icons/education";
import { Blackboard as BlackboardIcon } from "../icons/blackboard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

const items = [
  {
    href: "/teams",
    icon: <BookIcon fontSize="small" />,
    title: "Teams",
  },
  // {
  //   href: "/",
  //   icon: <EducationIcon fontSize="small" />,
  //   title: "Tournaments",
  // },
  // {
  //   href: "/rounds",
  //   icon: <ChildIcon fontSize="small" />,
  //   title: "Rounds",
  // },
  {
    href: "/matches",
    icon: <BlackboardIcon fontSize="small" />,
    title: "Matches",
  },
  {
    href: "/questions",
    icon: <AccountBalanceIcon fontSize="small" />,
    title: "Questions",
  },
  {
    href: "/answers",
    icon: <LaboratoryIcon fontSize="small" />,
    title: "Answers",
  },
];

export const DashboardSidebar = (props) => {
  const { open, onClose } = props;
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"), {
    defaultMatches: true,
    noSsr: true,
  });

  const content = (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <A href="/" style={{ color: "inherit", textDecoration: "none" }}>
          <Stack direction={"row"} alignItems="center" sx={{ p: 3 }}>
            <Logo
              sx={{
                height: 42,
                width: 42,
              }}
            />
            <Typography ml={2} variant="h5">
              PROCON {new Date().getFullYear()}
            </Typography>
          </Stack>
        </A>
        <Box sx={{ flexGrow: 1 }}>
          {items.map((item) => (
            <NavItem
              key={item.title}
              icon={item.icon}
              href={item.href}
              title={item.title}
            />
          ))}
          <Divider light={true} />
        </Box>
      </Box>
    </>
  );

  if (lgUp) {
    return (
      <Drawer
        anchor="left"
        open
        PaperProps={{
          sx: {
            backgroundColor: "neutral.900",
            color: "#FFFFFF",
            width: 280,
          },
        }}
        variant="permanent"
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="left"
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          backgroundColor: "neutral.900",
          color: "#FFFFFF",
          width: 280,
        },
      }}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 100 }}
      variant="temporary"
    >
      {content}
    </Drawer>
  );
};

DashboardSidebar.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
