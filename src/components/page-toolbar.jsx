import { Toolbar, Button, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { TimeIs } from "./time-is";
import { useIntl } from "react-intl";
const PageToolbar = ({
	title,
  showTimeIs = false,
	showNew,
	showEdit,
	showDelete,
	handleNew,
	// Create is sometimes offered before its prerequisite exists (e.g. a match
	// needs a round). Disable it WITH a reason rather than letting the form
	// open and fail on the server.
	newDisabled = false,
	newTooltip = "",
	editBtns,
	handleDelete,
	customBtns = [],
	...others
}) => {
	const { formatMessage: tr } = useIntl();
	return (
		<Toolbar variant="dense" {...others}>
			<Typography sx={{ flex: showTimeIs ? "unset" : 1 }} variant="h6">
				{title}
			</Typography>
			{showTimeIs ? (
				<TimeIs sx={{ flex: 1 }} />
			) : (
				<></>
			)}
			{showNew ? (
				// A disabled MUI Button swallows pointer events, so the tooltip
				// needs its own wrapper element to hang off.
				<Tooltip title={newTooltip || ""}>
					<span>
						<Button onClick={handleNew} disabled={newDisabled}>
							<AddIcon />
							{tr({ id: "Create" })}
						</Button>
					</span>
				</Tooltip>
			) : (
				<></>
			)}
			{showEdit ? (
				editBtns.map((item, idx) => (
					<Button key={idx} onClick={item.fn}>
						<EditIcon />
						{item.label}
					</Button>
				))
			) : (
				<></>
			)}
			{customBtns.map((item, idx) => (
				<Button
					key={`custom-${idx}`}
					onClick={item.fn}
					color={item.color || "primary"}>
					{item.icon}
					{item.label}
				</Button>
			))}
			{showDelete ? (
				<Button onClick={handleDelete}>
					<DeleteIcon />
					{tr({ id: "Remove" })}
				</Button>
			) : (
				<></>
			)}
		</Toolbar>
	);
};
export default PageToolbar;
