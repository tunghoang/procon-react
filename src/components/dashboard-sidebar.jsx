import PropTypes from "prop-types";
import {
	Box,
	Button,
	Drawer,
	Divider,
	Typography,
	useMediaQuery,
	Stack,
} from "@mui/material";
import { Link, useSearch } from "@tanstack/react-router";
import Logo from "./logo";
import { NavItem } from "./nav-item";

import { Blackboard as BlackboardIcon } from "../icons/blackboard";
import QuizIcon from "@mui/icons-material/Quiz";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import PeopleIcon from "@mui/icons-material/People";
import WarningIcon from "@mui/icons-material/Warning";

const items = [
	{
		href: "/admin/teams",
		icon: <PeopleIcon fontSize="small" />,
		title: "Teams",
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
		href: "/admin/answers",
		icon: <QuestionAnswerIcon fontSize="small" />,
		title: "Answers",
	},
];

export const DashboardSidebar = (props) => {
	const { open, onClose } = props;
	const searchParams = useSearch({ strict: false });
	const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"), {
		defaultMatches: true,
		noSsr: true,
	});

	const content = (
		<>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
				}}>
				<Logo sx={{ p: 3 }} />
				<Box sx={{ flexGrow: 1 }}>
					{items.map((item) => (
						<NavItem
							key={item.title}
							icon={item.icon}
							href={item.href}
							title={item.title}
						/>
					))}
					<Divider light={true} />
				</Box>
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
				</Box>
			</Box>
		</>
	);

	if (lgUp) {
		return (
			<Drawer
				anchor="left"
				PaperProps={{
					sx: {
						backgroundColor: "neutral.900",
						color: "#FFFFFF",
						width: 280,
					},
				}}
				variant="permanent">
				{content}
			</Drawer>
		);
	}

	return (
		<Drawer
			anchor="left"
			onClose={onClose}
			open={open}
			PaperProps={{
				sx: {
					backgroundColor: "neutral.900",
					color: "#FFFFFF",
					width: 280,
				},
			}}
			sx={{ zIndex: (theme) => theme.zIndex.appBar + 100 }}
			variant="temporary"
			disableEnforceFocus
			disableRestoreFocus>
			{content}
		</Drawer>
	);
};

DashboardSidebar.propTypes = {
	onClose: PropTypes.func,
	open: PropTypes.bool,
};
