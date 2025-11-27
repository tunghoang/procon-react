import PropTypes from "prop-types";
import {
	Box,
	Drawer,
	Divider,
	Typography,
	useMediaQuery,
	Stack,
} from "@mui/material";
import Logo from "./logo";
import { NavItem } from "./nav-item";

import { Blackboard as BlackboardIcon } from "../icons/blackboard";
import QuizIcon from "@mui/icons-material/Quiz";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import PeopleIcon from "@mui/icons-material/People";

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
