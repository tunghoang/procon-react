import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import { useNavigate } from "@tanstack/react-router";

export default function Forbidden() {
	const navigate = useNavigate();
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
					<BlockIcon
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
						403
					</Typography>
					<Typography
						align="center"
						color="textPrimary"
						variant="h4"
						sx={{ mb: 3 }}>
						Access Forbidden
					</Typography>
					<Typography
						align="center"
						color="textSecondary"
						variant="subtitle1"
						sx={{ mb: 4 }}>
						You don't have permission to access this page. This page is
						restricted to administrators only.
					</Typography>
					<Button
						onClick={() => navigate({ to: "/" })}
						variant="contained"
						size="large"
						sx={{ minWidth: 200 }}>
						Go to Home
					</Button>
				</Box>
			</Container>
		</Box>
	);
}
