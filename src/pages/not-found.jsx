import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useNavigate } from "@tanstack/react-router";
import { useIntl } from "react-intl";

export default function NotFound() {
	const navigate = useNavigate();
	const { formatMessage: tr } = useIntl();
	return (
		<Box
			component="main"
			sx={{
				alignItems: "center",
				display: "flex",
				flexGrow: 1,
				minHeight: "100vh",
				backgroundColor: "background.default",
			}}>
			<Container maxWidth="md">
				<Box
					sx={{
						alignItems: "center",
						display: "flex",
						flexDirection: "column",
						textAlign: "center",
					}}>
					<ErrorOutlineIcon
						sx={{
							fontSize: 120,
							color: "error.main",
							mb: 3,
						}}
					/>
					<Typography
						align="center"
						color="textPrimary"
						variant="h1"
						sx={{ mb: 2 }}>
						404
					</Typography>
					<Typography
						align="center"
						color="textPrimary"
						variant="h4"
						sx={{ mb: 3 }}>
						{tr({ id: "notfound.title" })}
					</Typography>
					<Typography
						align="center"
						color="textSecondary"
						variant="subtitle1"
						sx={{ mb: 4 }}>
						{tr({ id: "notfound.message" })}
					</Typography>
					<Button
						onClick={() => navigate({ to: "/" })}
						variant="contained"
						size="large"
						sx={{ minWidth: 200 }}>
						{tr({ id: "notfound.home" })}
					</Button>
				</Box>
			</Container>
		</Box>
	);
}
