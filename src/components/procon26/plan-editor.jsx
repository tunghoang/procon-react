import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { projectFuelNoRefuel, validatePlan } from "./game-handler";

/**
 * Official day-plan editor. The plan is entered directly as `number[][]` (one
 * command array per agent, agent-index order; 0..5 = move direction, a negative
 * number = wait |n| steps) -- paste solver output or type it. Per-agent step
 * counters validate the input live, and the parent gets the selected agent for
 * the board path preview. The parent owns the plan state.
 */
const PlanEditor = ({
	mapConfig,
	dayInformation,
	requiredSteps,
	plan,
	onPlanChange,
	selectedAgent,
	onSelectAgent,
	onSubmit,
	submitting,
	submitted,
	// The per-agent chips only pick which agent's path the board previews (and
	// show each agent's live step count). Hide them where the board has no path
	// preview (practice) -- submit always sends ALL agents' plans at once, so
	// the chips can mislead users into thinking they submit per agent.
	showAgentSelector = true,
}) => {
	const { formatMessage: tr } = useIntl();
	const [jsonDraft, setJsonDraft] = useState(null);
	const [jsonError, setJsonError] = useState(null);

	const agents = dayInformation?.agents || [];

	const validation = useMemo(
		() => validatePlan(mapConfig, dayInformation, plan, requiredSteps),
		[mapConfig, dayInformation, plan, requiredSteps],
	);

	// Soft, non-blocking fuel hint. The client can't know cross-agent refuel
	// timing (the server's lockstep engine decides that), so this only warns
	// which patrol cars would run dry WITHOUT a refuel -- it never disables
	// submit, since a refuel-car rendezvous may well cover the shortfall.
	const fuelWarnings = useMemo(
		() =>
			agents
				.map((agent, i) =>
					agent.kind === 0 &&
					projectFuelNoRefuel(mapConfig, agent.pos, agent.fuel, plan[i] || []).ranOut
						? i
						: null,
				)
				.filter((i) => i !== null),
		[agents, mapConfig, plan],
	);

	const applyJsonDraft = (text) => {
		setJsonDraft(text);
		try {
			const parsed = JSON.parse(text);
			if (!Array.isArray(parsed)) throw new Error("plan must be an array of arrays");
			setJsonError(null);
			onPlanChange(parsed);
		} catch (e) {
			setJsonError(e.message);
		}
	};

	// Re-sync the textarea when the plan is replaced from OUTSIDE (e.g. the day
	// switched and the parent reset every agent to an all-day wait). While the
	// user is mid-edit with invalid JSON we leave their draft untouched.
	useEffect(() => {
		if (jsonDraft === null) return;
		try {
			if (JSON.stringify(JSON.parse(jsonDraft)) !== JSON.stringify(plan)) {
				setJsonDraft(null);
				setJsonError(null);
			}
		} catch {
			/* draft is mid-edit invalid: keep it so the user can finish typing */
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [plan]);

	return (
		<Stack spacing={1.5}>
			{/* Per-agent step check. Clicking a chip selects the agent whose path
			    the board previews; green = that agent's plan uses exactly the day's
			    steps. */}
			{showAgentSelector && (
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					{agents.map((agent, index) => {
						const result = validation.agents[index];
						const ok = result && !result.error && result.steps === requiredSteps;
						return (
							<Chip
								key={index}
								label={`#${index} ${agent.kind === 0 ? tr({ id: "hexudon.patrol" }) : tr({ id: "hexudon.refuel" })} · ${result ? result.steps : 0}/${requiredSteps}`}
								color={index === selectedAgent ? "primary" : ok ? "success" : "default"}
								variant={index === selectedAgent ? "filled" : "outlined"}
								onClick={() => onSelectAgent(index)}
							/>
						);
					})}
				</Stack>
			)}

			<Typography variant="body2" color="textSecondary">
				{tr({ id: "hexudon.plan.inputHelp" }, { steps: requiredSteps })}
			</Typography>
			<TextField
				multiline
				minRows={6}
				value={jsonDraft ?? JSON.stringify(plan)}
				onChange={(evt) => applyJsonDraft(evt.target.value)}
				placeholder="[[2,2,-12],[-16],[0,1,-10]]"
				error={!!jsonError}
				spellCheck={false}
				sx={{ "& textarea": { fontFamily: "monospace" } }}
			/>
			{jsonError && <Alert severity="error">{jsonError}</Alert>}

			{/* Per-agent plan errors (off-map/pond move, wrong step count, ...). */}
			{validation.agents.map((result, index) =>
				result?.error ? (
					<Alert key={index} severity="error">
						#{index}: {result.error}
					</Alert>
				) : null,
			)}

			{validation.error && <Alert severity="error">{validation.error}</Alert>}

			{fuelWarnings.length > 0 && (
				<Alert severity="warning">
					{tr({ id: "hexudon.plan.fuelWarning" }, { agents: fuelWarnings.join(", ") })}
				</Alert>
			)}

			<Stack direction="row" spacing={2} alignItems="center">
				<Button
					variant="contained"
					disabled={!validation.valid || submitting}
					onClick={() => onSubmit(plan)}
				>
					{tr({ id: "hexudon.plan.submit" })}
				</Button>
				{submitted && <Chip color="success" label={tr({ id: "hexudon.plan.submitted" })} />}
				<Typography variant="body2" color="textSecondary">
					{tr({ id: "hexudon.plan.lastValidNote" })}
				</Typography>
			</Stack>
		</Stack>
	);
};

export default PlanEditor;
