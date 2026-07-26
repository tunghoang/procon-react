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
import { formatCountdown } from "../../utils/commons";

/**
 * Pre-match agent-kind selection: one 0 (patrol) / 1 (refuel) per agent, in
 * agent order. The window is bounded at BOTH ends (the N seconds before the
 * match's start time), so `opensIn` > 0 means the engine would refuse a choice
 * for now and the panel stays disabled. A team that never answers is defaulted
 * to all-patrol and plays on — see hexudon.kinds.hint.
 */
const AgentKindsPanel = ({ mapConfig, onSubmit, submitting, opensIn = 0 }) => {
	const { formatMessage: tr } = useIntl();
	const agentCount = (mapConfig.agents || []).length;
	const [kinds, setKinds] = useState(() => new Array(agentCount).fill(0));
	const notOpenYet = opensIn > 0;

	return (
		<Stack spacing={2}>
			<Alert severity={notOpenYet ? "warning" : "info"}>
				{notOpenYet
					? tr(
							{ id: "hexudon.kinds.notOpenYet" },
							{ time: formatCountdown(opensIn) },
						)
					: tr({ id: "hexudon.kinds.hint" })}
			</Alert>
			{/* Cap the per-car list height so a full 8-car roster scrolls
			    instead of stretching the panel down the page. */}
			<Stack spacing={1} sx={{ maxHeight: 300, overflowY: "auto", pr: 1 }}>
				{kinds.map((kind, index) => (
					<Stack key={index} direction="row" spacing={2} alignItems="center">
						<Typography sx={{ width: 130 }}>
							{tr({ id: "hexudon.agent" })} {index} — {tr({ id: "hexudon.cell" })}{" "}
							{mapConfig.agents[index]}
						</Typography>
						<ToggleButtonGroup
							exclusive
							size="small"
							// Locked, not merely unsubmittable: before the window opens
							// the engine refuses a choice, so the buttons must not
							// invite one either.
							disabled={notOpenYet}
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
				<Button
					variant="contained"
					disabled={submitting || notOpenYet}
					onClick={() => onSubmit(kinds)}
				>
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
