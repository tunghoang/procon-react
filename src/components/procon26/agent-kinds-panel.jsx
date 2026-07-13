import { useState } from "react";
import {
	Alert,
	Button,
	Chip,
	Stack,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { useIntl } from "react-intl";

/**
 * Pre-match agent-kind selection: one 0 (patrol) / 1 (refuel) per agent, in
 * agent order. Teams may resubmit until the selection window closes; a team
 * that never answers is locked to all-patrol.
 */
const AgentKindsPanel = ({ mapConfig, onSubmit, submitting }) => {
	const { formatMessage: tr } = useIntl();
	const agentCount = (mapConfig.agents || []).length;
	const [kinds, setKinds] = useState(() => new Array(agentCount).fill(0));

	return (
		<Stack spacing={2}>
			<Alert severity="info">{tr({ id: "hexudon.kinds.hint" })}</Alert>
			<Stack spacing={1}>
				{kinds.map((kind, index) => (
					<Stack key={index} direction="row" spacing={2} alignItems="center">
						<Typography sx={{ width: 130 }}>
							{tr({ id: "hexudon.agent" })} {index} — {tr({ id: "hexudon.cell" })}{" "}
							{mapConfig.agents[index]}
						</Typography>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={kind}
							sx={{
								"& .MuiToggleButton-root.Mui-selected": {
									bgcolor: "primary.main",
									color: "primary.contrastText",
									fontWeight: 700,
									"&:hover": { bgcolor: "primary.dark" },
								},
							}}
							onChange={(evt, value) => {
								if (value === null) return;
								setKinds((prev) => prev.map((k, i) => (i === index ? value : k)));
							}}
						>
							<ToggleButton value={0}>{tr({ id: "hexudon.patrol" })} (0)</ToggleButton>
							<ToggleButton value={1}>{tr({ id: "hexudon.refuel" })} (1)</ToggleButton>
						</ToggleButtonGroup>
					</Stack>
				))}
			</Stack>
			<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
				<Button variant="contained" disabled={submitting} onClick={() => onSubmit(kinds)}>
					{tr({ id: "hexudon.kinds.submit" })}
				</Button>
				{/* Live counts, updated as toggles change. */}
				<Chip
					size="small"
					color="primary"
					variant="outlined"
					label={`${tr({ id: "hexudon.patrol" })}: ${kinds.filter((k) => k === 0).length}`}
				/>
				<Chip
					size="small"
					color="success"
					variant="outlined"
					label={`${tr({ id: "hexudon.refuel" })}: ${kinds.filter((k) => k === 1).length}`}
				/>
			</Stack>
		</Stack>
	);
};

export default AgentKindsPanel;
