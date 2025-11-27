import { Stack, Typography } from "@mui/material";
import { LogoIcon } from "./logo-icon";
import React from "react";

export default function Logo({ ...props }) {
	return (
		<a
			href="/"
			style={{
				color: "inherit",
				textDecoration: "none",
			}}>
			<Stack direction={"row"} alignItems="center" {...props}>
				<LogoIcon
					sx={{
						height: 42,
						width: 42,
					}}
				/>
				<Typography ml={2} variant="h5">
					PROCON {new Date().getFullYear()}
				</Typography>
			</Stack>
		</a>
	);
}
