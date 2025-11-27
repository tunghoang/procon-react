import { Link, useLocation, useSearch } from "@tanstack/react-router";
import PropTypes from "prop-types";
import { Box, Button, ListItem } from "@mui/material";
import { useIntl } from "react-intl";

export const NavItem = (props) => {
	const { href, icon, title, ...others } = props;
	const location = useLocation();
	const search = useSearch({ strict: false });
	const active = href ? location.pathname === href : false;

	const intl = useIntl();
	return (
		<ListItem
			disableGutters
			sx={{
				display: "flex",
				mb: 0.5,
				py: 0,
				px: 2,
			}}
			{...others}>
			<Link
				to={href}
				search={search}
				style={{ width: "100%", textDecoration: "none" }}>
				<Button
					component="span"
					startIcon={icon}
					disableRipple
					sx={{
						backgroundColor: active && "rgba(255,255,255, 0.08)",
						borderRadius: 1,
						color: active ? "secondary.main" : "neutral.300",
						fontWeight: active && "fontWeightBold",
						justifyContent: "flex-start",
						px: 3,
						textAlign: "left",
						textTransform: "none",
						width: "100%",
						"& .MuiButton-startIcon": {
							color: active ? "secondary.main" : "neutral.400",
						},
						"&:hover": {
							backgroundColor: "rgba(255,255,255, 0.08)",
						},
					}}>
					<Box sx={{ flexGrow: 1 }}>{intl.formatMessage({ id: title })}</Box>
				</Button>
			</Link>
		</ListItem>
	);
};

NavItem.propTypes = {
	href: PropTypes.string,
	icon: PropTypes.node,
	title: PropTypes.string,
};
