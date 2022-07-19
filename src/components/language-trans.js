import { useContext, useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Context from "../context";
import {
  Avatar,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Stack,
} from "@mui/material";
import { useIntl } from "react-intl";

export default function LanguageTrans() {
  const { locale, updateLocalStorage } = useContext(Context);
  const [anchorEl, setAnchorEl] = useState(null);
  const { formatMessage: tr } = useIntl();
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const selectItem = (item) => {
    updateLocalStorage({ locale: item });
    setAnchorEl(null);
  };

  const flags = [
    {
      imgSrc: "/static/images/flags/vi.png",
      trans: "vi-VN",
      title: tr({ id: "Vietnamese" }),
    },
    {
      imgSrc: "/static/images/flags/en.png",
      trans: "en-US",
      title: tr({ id: "English" }),
    },
  ];

  const currentFlag = flags.find((flag) => flag.trans === locale);

  return (
    <>
      <Tooltip title={tr({ id: "Language" })}>
        <Stack
          direction={"row"}
          spacing={1}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          <Avatar
            sx={{
              height: 25,
              width: 25,
            }}
            src={currentFlag.imgSrc}
          />
          <span style={{ color: "#000" }}>
            {currentFlag.trans.split("-")[0]}
          </span>
        </Stack>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        {flags.map((flag) => {
          return (
            <MenuItem onClick={() => selectItem(flag.trans)} key={flag.trans}>
              <ListItemIcon>
                <Avatar
                  onClick={handleClick}
                  style={{ cursor: "pointer" }}
                  sx={{
                    height: 25,
                    width: 25,
                  }}
                  src={flag.imgSrc}
                />
              </ListItemIcon>
              <ListItemText sx={{ color: locale === flag.trans && "blue" }}>
                {flag.title}
              </ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
