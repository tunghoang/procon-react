import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
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
	unmountOnExit = false,
}) => {
	return (
		<Accordion
			TransitionProps={{ unmountOnExit }}
			defaultExpanded={defaultExpanded}>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Typography variant="h6" mr={1}>
					{title}
				</Typography>
				{showCopy && (
					<Tooltip title="Copy">
						<Box
							component="div"
							onClick={async (e) => {
								e.stopPropagation();
								const isCopied = await copyText(
									JSON.stringify(copyContent || board)
								);
								if (isCopied) {
									showMessage("Copied board to clipboard!", "success", 2000);
								} else {
									showMessage(
										"Copy unavailable — open DevTools to view the result.",
										"warning",
										2000
									);
								}
							}}
							sx={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								width: 32,
								height: 32,
								borderRadius: 1,
								cursor: "pointer",
								transition: "background-color 0.2s",
								"&:hover": {
									backgroundColor: "action.hover",
								},
								"&:active": {
									backgroundColor: "action.selected",
								},
							}}>
							<ContentCopyIcon fontSize="small" />
						</Box>
					</Tooltip>
				)}
			</AccordionSummary>
			<AccordionDetails>{children}</AccordionDetails>
		</Accordion>
	);
};

export default AccordionBoard;
