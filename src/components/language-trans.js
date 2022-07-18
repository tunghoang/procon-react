import { useContext, useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Context from "../context";
import { IconButton, ListItemText, Tooltip } from "@mui/material";
import GTranslateIcon from "@mui/icons-material/GTranslate";
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

  return (
    <>
      <Tooltip title={tr({ id: "Language" })}>
        <IconButton onClick={handleClick} size={"small"}>
          <GTranslateIcon sx={{ width: "20px", height: "20px" }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        <MenuItem onClick={() => selectItem("vi-VN")}>
          <ListItemText sx={{ color: locale === "vi-VN" && "blue" }}>
            VN - Tiếng Việt
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectItem("en-US")}>
          <ListItemText sx={{ color: locale === "en-US" && "blue" }}>
            EN - English
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
