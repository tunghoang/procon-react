import React, { useState } from "react";
import {
	Box,
	Typography,
	Grid,
	Card,
	CardContent,
	Divider,
	Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupsIcon from "@mui/icons-material/Groups";
import { useIntl } from "react-intl";

const CardData = ({
	handleDelete,
	handleEdit,
	handleSelect,
	showAction = true,
	name,
	description,
	header,
	disabled = false,
	action,
	handleEditDetail = null,
	handleManageTeams = null,
	...rest
}) => {
	const [zDepth, setZDepth] = useState(false);
	const [color, setColor] = useState(!disabled ? "#FFFFFF" : "#F0F0F0");
	const { formatMessage: tr } = useIntl();
	return (
		<>
			<Card
				raised={zDepth}
				onMouseOver={() => {
					if (disabled) return;
					setZDepth(true);
					setColor("#f5f4e3");
				}}
				onMouseOut={() => {
					if (disabled) return;
					setZDepth(false);
					setColor("#FFFFFF");
				}}
				sx={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					backgroundColor: color,
				}}
				{...rest}>
				<CardContent
					sx={{ cursor: "pointer" }}
					onClick={!disabled ? handleSelect : () => {}}>
					<Box display="flex" justifyContent="flex-end">
						{header}
					</Box>
					<Typography
						align="center"
						color="textPrimary"
						gutterBottom
						variant="h5">
						{name}
					</Typography>
					<Typography align="center" color="textPrimary" variant="div">
						{description}
					</Typography>
				</CardContent>
				<Box sx={{ flexGrow: 1 }} />
				{showAction && (
					<>
						<Divider />
						<Box sx={{ p: 2 }}>
							{action ? (
								action
							) : (
								<Grid
									container
									spacing={2}
									sx={{ justifyContent: "space-between" }}>
									<Grid sx={{ alignItems: "center", display: "flex" }}>
										{handleEdit && (
											<Button onClick={handleEdit}>
												<EditIcon color="action" />
												<Typography
													color="textSecondary"
													display="inline"
													sx={{ pl: 1 }}
													variant="body2">
													{tr({ id: "Edit" })}
												</Typography>
											</Button>
										)}
									</Grid>
									<Grid sx={{ alignItems: "center", display: "flex" }}>
										{handleManageTeams && (
											<Button onClick={handleManageTeams} color="primary">
												<GroupsIcon color="primary" />
												<Typography
													color="primary"
													display="inline"
													sx={{ pl: 1 }}
													variant="body2">
													{tr({ id: "Teams" })}
												</Typography>
											</Button>
										)}
										{handleEditDetail && (
											<Button onClick={handleEditDetail}>
												<SettingsIcon color="action" />
												<Typography
													color="textSecondary"
													display="inline"
													sx={{ pl: 1 }}
													variant="body2">
													{tr({ id: "Detail" })}
												</Typography>
											</Button>
										)}
									</Grid>
									<Grid sx={{ alignItems: "center", display: "flex" }}>
										{handleDelete && (
											<Button onClick={handleDelete} color="error">
												<DeleteIcon color="error" />
												<Typography
													display="inline"
													sx={{ pl: 1, fontWeight: "bold" }}
													variant="body2">
													{tr({ id: "Remove" })}
												</Typography>
											</Button>
										)}
									</Grid>
								</Grid>
							)}
						</Box>
					</>
				)}
			</Card>
		</>
	);
};

export default CardData;
