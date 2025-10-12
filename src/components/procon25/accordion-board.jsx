import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { showMessage } from "../../api/commons";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { copyText } from "../../utils/commons";

const AccordionBoard = ({
  title,
  board,
  children,
  copyContent,
  showCopy = false,
  defaultExpanded = false,
}) => {
  return (
    <Accordion
      TransitionProps={{ unmountOnExit: true }}
      defaultExpanded={defaultExpanded}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6" mr={1}>
          {title}
        </Typography>
        {showCopy && (
          <Tooltip title="Copy">
            <IconButton
              size="small"
              onClick={async (e) => {
                e.stopPropagation();
                const isCopied = await copyText(JSON.stringify(copyContent || board))
                if (isCopied) {
                  showMessage("Copied board to clipboard!", "success", 2000);
                } else {
                  showMessage("Copy is unavailable", "warning", 2000);
                }
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export default AccordionBoard;
