import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import GameBoard from "./game-board";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const AccordionBoard = ({ title, board, children }) => {
  return (
    <Accordion TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {children ? children : <GameBoard board={board} />}
      </AccordionDetails>
    </Accordion>
  );
};

export default AccordionBoard;
