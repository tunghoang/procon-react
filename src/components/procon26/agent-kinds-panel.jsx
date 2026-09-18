import { useEffect, useRef, useState } from "react";
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
import { normalizeKinds } from "../../utils/agent-kinds";

/**
 * Pre-match agent-kind selection: one 0 (patrol) / 1 (refuel) per agent, in
 * agent order. The window is bounded at BOTH ends (the N seconds before the
 * match's start time), so `opensIn` > 0 means the engine would refuse a choice
 * for now and the panel stays disabled. A team that never answers is defaulted
 * to all-patrol and plays on — see hexudon.kinds.hint.
 *
 * `submittedKinds` is what the ENGINE already has for this team (from
 * /game/state, once `types_selected`). Selection may be re-sent until the
 * window closes, so the toggles must start from the live choice: showing
 * all-patrol after a submit made a team believe its refuel cars were gone, and
 * a second submit from that screen really did overwrite them with patrols.
 *
 * Note that /game/state reports kinds as the STRINGS "patrol"/"refuel" (the
 * engine's AgentType is a str enum) while the submit body and /game/day use
 * 0/1 -- utils/agent-kinds.js accepts both, and is the only place that
 * conversion lives.
 */
const AgentKindsPanel = ({
	mapConfig,
	onSubmit,
	submitting,
	opensIn = 0,
	submittedKinds = null,
}) => {
	const { formatMessage: tr } = useIntl();
	const agentCount = (mapConfig.agents || []).length;
	const normalize = (source) => normalizeKinds(source, agentCount);
	const [kinds, setKinds] = useState(() => normalize(submittedKinds));
	// Adopt the engine's kinds once (and again if the team submits from another
	// tab), but never fight the user mid-edit: only a CHANGED server value is
	// taken, so local toggling still wins between polls.
	const lastAdopted = useRef(JSON.stringify(normalize(submittedKinds)));
	useEffect(() => {
		if (!submittedKinds) return;
		const next = JSON.stringify(normalize(submittedKinds));
		if (next === lastAdopted.current) return;
		lastAdopted.current = next;
		setKinds(JSON.parse(next));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(submittedKinds), agentCount]);
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
