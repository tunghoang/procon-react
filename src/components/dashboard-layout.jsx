import { useState } from "react";
import { Box } from "@mui/material";
import { DashboardNavbar } from "./dashboard-navbar";
import { DashboardSidebar } from "./dashboard-sidebar";

const SIDEBAR_WIDTH = 280;

export const DashboardLayout = (props) => {
	const { children } = props;
	const [isSidebarOpen, setSidebarOpen] = useState(true);

	return (
		<Box sx={{ display: "flex", minHeight: "100vh" }}>
			<DashboardSidebar open={isSidebarOpen} width={SIDEBAR_WIDTH} />
			<Box
				component="main"
				sx={{
					flexGrow: 1,
					display: "flex",
					flexDirection: "column",
					minWidth: 0,
				}}>
				<DashboardNavbar
					onSidebarOpen={() => setSidebarOpen(true)}
					onSidebarClose={() => setSidebarOpen(false)}
					isSidebarOpen={isSidebarOpen}
				/>
				<Box sx={{ flexGrow: 1, overflow: "auto" }}>{children}</Box>
			</Box>
		</Box>
	);
};
