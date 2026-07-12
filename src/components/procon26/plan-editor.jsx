import { useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Stack,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import BackspaceIcon from "@mui/icons-material/Backspace";
import { useIntl } from "react-intl";
import {
	DIRECTIONS,
	TERRAIN_NAMES,
	flattenCells,
	neighborCell,
	simulateCommands,
	trafficByPos,
	validatePlan,
} from "./game-handler";

/**
 * Official day-plan editor. Builds `plan: number[][]` (one command array per
 * agent; 0..5 move, negative = wait |n| steps). Two input modes: per-agent buttons
 * with live step accounting, and a raw-JSON tab for pasting solver output.
 * The parent owns the plan state and receives per-agent path previews.
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
}) => {
	const { formatMessage: tr } = useIntl();
	const [tab, setTab] = useState(0);
	const [waitSteps, setWaitSteps] = useState(1);
	const [jsonDraft, setJsonDraft] = useState(null);
	const [jsonError, setJsonError] = useState(null);

	const agents = dayInformation?.agents || [];
	const traffic = useMemo(() => trafficByPos(dayInformation), [dayInformation]);
	const cells = useMemo(() => flattenCells(mapConfig), [mapConfig]);

	const validation = useMemo(
		() => validatePlan(mapConfig, dayInformation, plan, requiredSteps),
		[mapConfig, dayInformation, plan, requiredSteps],
	);

	const agentResult = validation.agents[selectedAgent];
	const commands = plan[selectedAgent] || [];
	const endPos = agentResult?.path?.length
		? agentResult.path[agentResult.path.length - 1]
		: agents[selectedAgent]?.pos;

	const changeAgentCommands = (mutate) => {
		const next = plan.map((cmds, i) => (i === selectedAgent ? mutate([...cmds]) : cmds));
		onPlanChange(next);
	};

	const directionDisabled = (code) => {
		if (endPos === undefined || endPos === null) return true;
		const target = neighborCell(mapConfig.map.width, mapConfig.map.height, endPos, code);
		if (target === null) return true;
		return TERRAIN_NAMES[cells[target]] === "pond";
	};

	const commandLabel = (command) =>
		command <= -1 ? `${tr({ id: "hexudon.wait" })} ${Math.abs(command)}` : DIRECTIONS[command].arrow;

	const applyJsonDraft = (text) => {
		setJsonDraft(text);
		try {
			const parsed = JSON.parse(text);
			if (!Array.isArray(parsed)) throw new Error("plan must be an array");
			setJsonError(null);
			onPlanChange(parsed);
		} catch (e) {
			setJsonError(e.message);
		}
	};

	return (
		<Stack spacing={1.5}>
			<Tabs value={tab} onChange={(evt, value) => setTab(value)}>
				<Tab label={tr({ id: "hexudon.plan.builder" })} />
				<Tab label="JSON" />
			</Tabs>

			{tab === 0 && (
				<>
					<Stack direction="row" spacing={1} flexWrap="wrap">
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

					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
						{DIRECTIONS.map((direction) => (
							<Button
								key={direction.code}
								variant="outlined"
								size="small"
								disabled={directionDisabled(direction.code)}
								onClick={() =>
									changeAgentCommands((cmds) => {
										cmds.push(direction.code);
										return cmds;
									})
								}
							>
								{direction.arrow} {direction.code}
							</Button>
						))}
						<TextField
							size="small"
							type="number"
							label={tr({ id: "hexudon.wait" })}
							value={waitSteps}
							onChange={(evt) => setWaitSteps(Math.max(1, parseInt(evt.target.value, 10) || 1))}
							sx={{ width: 90 }}
						/>
						<Button
							variant="outlined"
							size="small"
							onClick={() =>
								changeAgentCommands((cmds) => {
									cmds.push(-waitSteps);
									return cmds;
								})
							}
						>
							+ {tr({ id: "hexudon.wait" })}
						</Button>
						<Button
							size="small"
							startIcon={<BackspaceIcon />}
							onClick={() =>
								changeAgentCommands((cmds) => {
									cmds.pop();
									return cmds;
								})
							}
						>
							{tr({ id: "hexudon.undo" })}
						</Button>
						<Button
							size="small"
							color="warning"
							onClick={() => changeAgentCommands(() => [])}
						>
							{tr({ id: "hexudon.clear" })}
						</Button>
					</Stack>

					<Box>
						<Typography variant="body2" color="textSecondary">
							{tr({ id: "hexudon.agent" })} #{selectedAgent}:{" "}
							{commands.length ? commands.map(commandLabel).join("  ") : tr({ id: "hexudon.plan.empty" })}
						</Typography>
						{agentResult?.error ? (
							<Alert severity="error" sx={{ mt: 1 }}>
								{agentResult.error}
							</Alert>
						) : (
							<Typography variant="body2" sx={{ mt: 1 }}>
								{tr({ id: "hexudon.steps" })}: {agentResult?.steps ?? 0} / {requiredSteps}
							</Typography>
						)}
					</Box>
				</>
			)}

			{tab === 1 && (
				<Stack spacing={1}>
					<TextField
						multiline
						minRows={6}
						value={jsonDraft ?? JSON.stringify(plan)}
						onChange={(evt) => applyJsonDraft(evt.target.value)}
						placeholder='[[2,2,-12],[-16],[0,1,-10]]'
					/>
					{jsonError && <Alert severity="error">{jsonError}</Alert>}
				</Stack>
			)}

			{validation.error && <Alert severity="error">{validation.error}</Alert>}

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
