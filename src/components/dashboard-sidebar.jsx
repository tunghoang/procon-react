import PropTypes from "prop-types";
import { useContext } from "react";
import { Box, Button, Divider } from "@mui/material";
import { Link, useSearch } from "@tanstack/react-router";
import Logo from "./logo";
import { NavItem } from "./nav-item";
import Context from "../context";
import { isSuperAdmin } from "../utils/roles";

import { Blackboard as BlackboardIcon } from "../icons/blackboard";
import QuizIcon from "@mui/icons-material/Quiz";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import PeopleIcon from "@mui/icons-material/People";
import WarningIcon from "@mui/icons-material/Warning";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SchoolIcon from "@mui/icons-material/School";

// `superOnly` items are the organiser's structure; a group manager gets the
// rest, scoped to its group by the backend.
const items = [
	{
		href: "/admin/teams",
		icon: <PeopleIcon fontSize="small" />,
		title: "Teams",
	},
	{
		href: "/admin/groups",
		icon: <SchoolIcon fontSize="small" />,
		title: "Groups",
		superOnly: true,
	},
	{
		href: "/admin/matches",
		icon: <BlackboardIcon fontSize="small" />,
		title: "Matches",
	},
	{
		href: "/admin/questions",
		icon: <QuizIcon fontSize="small" />,
		title: "Questions",
	},
	{
		href: "/admin/round-standings",
		icon: <SummarizeIcon fontSize="small" />,
		title: "standings.nav",
	},
	// procon25 legacy — hidden for HEXUDON (routes still exist):
	// {
	// 	href: "/admin/answers",
	// 	icon: <QuestionAnswerIcon fontSize="small" />,
	// 	title: "Answers",
	// },
	// {
	// 	href: "/admin/score-summary",
	// 	icon: <SummarizeIcon fontSize="small" />,
	// 	title: "score-summary",
	// },
];

export const DashboardSidebar = (props) => {
	const { open, width = 280 } = props;
	const searchParams = useSearch({ strict: false });
	const { team } = useContext(Context);
	const visibleItems = items.filter((item) => !item.superOnly || isSuperAdmin(team));

	return (
		<Box
			component="nav"
			sx={{
				width: open ? width : 0,
				flexShrink: 0,
				transition: "width 0.3s ease",
				overflow: "hidden",
			}}>
			<Box
				sx={{
					position: "fixed",
					top: 0,
					left: 0,
					width,
					height: "100vh",
					backgroundColor: "neutral.900",
					color: "#FFFFFF",
					transform: open ? "translateX(0)" : `translateX(-${width}px)`,
					transition: "transform 0.3s ease",
					display: "flex",
					flexDirection: "column",
					zIndex: 1200,
				}}>
				<Logo sx={{ p: 3 }} />
				<Box sx={{ flexGrow: 1 }}>
					{visibleItems.map((item) => (
						<NavItem
							key={item.title}
							icon={item.icon}
							href={item.href}
							title={item.title}
						/>
					))}
					<Divider light={true} />
				</Box>
				{/* procon25 legacy — the reset page calls endpoints that do not
				    exist in the backend; hidden for HEXUDON (route still exists).
				<Box sx={{ pb: 2, px: 2 }}>
					<Link
						to="/admin/reset"
						search={searchParams}
						style={{ width: "100%", textDecoration: "none" }}>
						<Button
							fullWidth
							startIcon={<WarningIcon />}
							sx={{
								backgroundColor: "#d32f2f",
								color: "#fff",
								justifyContent: "flex-start",
								px: 3,
								py: 1,
								textTransform: "none",
								"&:hover": {
									backgroundColor: "#b71c1c",
								},
							}}>
							Admin Actions
						</Button>
					</Link>
				</Box> */}
			</Box>
		</Box>
	);
};

DashboardSidebar.propTypes = {
	open: PropTypes.bool,
	width: PropTypes.number,
};
