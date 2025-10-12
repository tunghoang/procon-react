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
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(
                  JSON.stringify(copyContent || board)
                );
                showMessage("Copied board to clipboard!", "success", 2000);
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
