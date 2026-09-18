import { Component } from "react";
import { Alert, AlertTitle, Box, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { t } from "../i18n";

/**
 * Last line of defence around a screen.
 *
 * A render-time throw anywhere below unmounts React's whole tree and leaves a
 * WHITE PAGE -- during a live match that reads as "the system is down" and the
 * team loses the day. This catches it, says what happened and offers a reload,
 * which is exactly the F5 that used to be the only cure.
 *
 * A class component on purpose: `componentDidCatch` has no hook equivalent.
 * Strings go through the standalone intl instance (`i18n.js`) because an error
 * boundary must keep working even if the failure came from a context provider.
 */
class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// Keep the stack in the console for the operator; never show it raw in
		// the UI.
		console.error("Unhandled render error", error, info?.componentStack);
	}

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;
		return (
			<Box sx={{ p: 2 }}>
				<Alert
					severity="error"
					action={
						<Button
							color="inherit"
							size="small"
							startIcon={<RefreshIcon />}
							onClick={() => window.location.reload()}>
							{t("error.reload")}
						</Button>
					}>
					<AlertTitle>{t("error.title")}</AlertTitle>
					<Stack spacing={0.5}>
						<span>{t("error.body")}</span>
						<Box component="code" sx={{ fontSize: 12, opacity: 0.8 }}>
							{String(error?.message || error)}
						</Box>
					</Stack>
				</Alert>
			</Box>
		);
	}
}

export default ErrorBoundary;
