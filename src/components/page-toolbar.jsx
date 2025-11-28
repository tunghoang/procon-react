import { Toolbar, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { useIntl } from "react-intl";
const PageToolbar = ({
	title,
	showNew,
	showEdit,
	showDelete,
	handleNew,
	editBtns,
	handleDelete,
	customBtns = [],
	...others
}) => {
	const { formatMessage: tr } = useIntl();
	return (
		<Toolbar variant="dense" {...others}>
			<Typography sx={{ flex: 1 }} variant="h6">
				{title}
			</Typography>
			{showNew ? (
				<Button onClick={handleNew}>
					<AddIcon />
					{tr({ id: "Create" })}
				</Button>
			) : (
				<></>
			)}
			{showEdit ? (
				editBtns.map((item, idx) => (
					<Button key={idx} onClick={item.fn}>
						<EditIcon />
						{tr({ id: item.label })}
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
					{tr({ id: item.label })}
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
