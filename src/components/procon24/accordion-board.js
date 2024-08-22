import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { showMessage } from "../../api/commons";
import GameBoard from "./game-board";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const AccordionBoard = ({
  title,
  board,
  children,
  defaultExpanded = false,
}) => {
  return (
    <Accordion
      TransitionProps={{ unmountOnExit: true }}
      defaultExpanded={defaultExpanded}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6" mr={1}>
          {title}{" "}
        </Typography>
        {!children && (
          <Tooltip title="Copy">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(JSON.stringify(board));
                showMessage("Copied to clipboard!", "success", 2000);
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </AccordionSummary>
      <AccordionDetails>
        {children ? children : <GameBoard board={board} />}
      </AccordionDetails>
    </Accordion>
  );
};

export default AccordionBoard;
