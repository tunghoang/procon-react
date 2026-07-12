import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useIntl } from "react-intl";
import {
	TERRAIN_NAMES,
	flattenCells,
	hexLayout,
	rowColOf,
	trafficByPos,
} from "./game-handler";

const TERRAIN_FILL = {
	plain: "#b5d99c",
	mountain: "#a1887f",
	pond: "#64b5f6",
};
const ROAD_FILL = ["#d6d6d6", "#f3c969", "#e57373"]; // smooth / congested / jam
const OTHER_TEAM_COLORS = ["#8e24aa", "#ef6c00", "#00838f", "#c2185b", "#5d4037"];

const LEGEND = [
	["#b5d99c", "hexudon.legend.plain"],
	["#a1887f", "hexudon.legend.mountain"],
	["#64b5f6", "hexudon.legend.pond"],
	["#d6d6d6", "hexudon.legend.roadSmooth"],
	["#f3c969", "hexudon.legend.roadCongested"],
	["#e57373", "hexudon.legend.roadJam"],
];

/**
 * SVG renderer for a HEXUDON board. Pointy-top hexes; even rows shifted right
 * (official Q&A Q1) so the picture tiles exactly like the rule engine's
 * adjacency. `dayInformation` adds own/other agents and road conditions;
 * `adminTeams` renders every team (admin spectator); `paths` overlays planned
 * routes ({agentIndex: cellId[]}).
 */
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.25;

const HexBoard = ({
	mapConfig,
	dayInformation = null,
	adminTeams = null,
	paths = {},
	selectedAgent = null,
	radius: baseRadius = 13,
	roadByCell = null,
	highlightCells = null,
	replayTeams = null,
}) => {
	const { formatMessage: tr } = useIntl();
	const [zoom, setZoom] = useState(1);
	const radius = baseRadius * zoom;
	const layout = useMemo(() => hexLayout(radius), [radius]);
	const cells = useMemo(() => flattenCells(mapConfig), [mapConfig]);
	// Replay passes an explicit per-day road-condition map; live play derives it
	// from the day information's traffics.
	const traffic = useMemo(
		() => roadByCell || trafficByPos(dayInformation),
		[roadByCell, dayInformation],
	);
	const highlight = useMemo(
		() => new Set((highlightCells || []).map(Number)),
		[highlightCells],
	);
	const spotsByPos = useMemo(() => {
		const result = {};
		for (const spot of mapConfig.spots || []) result[spot.pos] = spot;
		return result;
	}, [mapConfig]);

	const { width, height } = mapConfig.map;
	const svgWidth = (width + 1.5) * layout.width;
	const svgHeight = (height + 1) * 1.5 * radius + radius;

	const centerOf = (cell) => {
		const [row, col] = rowColOf(cell, width);
		return layout.center(row, col);
	};

	const renderCells = () =>
		cells.map((code, cell) => {
			const { x, y } = centerOf(cell);
			const name = TERRAIN_NAMES[code];
			const fill =
				name === "road" ? ROAD_FILL[traffic[cell] ?? 0] : TERRAIN_FILL[name];
			return (
				<polygon
					key={cell}
					points={layout.corners(x, y)}
					fill={fill}
					stroke="#607d5b"
					strokeWidth="0.6"
				>
					<title>{`#${cell} ${name}${name === "road" ? ` (${["smooth", "congested", "jam"][traffic[cell] ?? 0]})` : ""}`}</title>
				</polygon>
			);
		});

	const renderSpots = () =>
		(mapConfig.spots || []).map((spot) => {
			const { x, y } = centerOf(spot.pos);
			return (
				<g key={`spot-${spot.pos}`}>
					<circle cx={x} cy={y} r={radius * 0.52} fill="#fff59d" stroke="#f9a825" strokeWidth="1.2" />
					<text x={x} y={y + radius * 0.2} textAnchor="middle" fontSize={radius * 0.62} fill="#795548" fontWeight="bold">
						{spot.brand}
					</text>
					<title>{`Spot: brand ${spot.brand}, stock ${spot.stocks}/day`}</title>
				</g>
			);
		});

	const renderAgentToken = ({ key, cell, color, label, big = false, offset = 0 }) => {
		const { x, y } = centerOf(cell);
		const r = big ? radius * 0.46 : radius * 0.32;
		const dx = offset * radius * 0.35;
		return (
			<g key={key}>
				<circle cx={x + dx} cy={y - radius * 0.35} r={r} fill={color} stroke="#fff" strokeWidth="1.2" />
				<text
					x={x + dx}
					y={y - radius * 0.35 + r * 0.55}
					textAnchor="middle"
					fontSize={r * 1.15}
					fill="#fff"
					fontWeight="bold"
				>
					{label}
				</text>
			</g>
		);
	};

	const renderOwnAgents = () =>
		(dayInformation?.agents || []).map((agent, index) =>
			renderAgentToken({
				key: `own-${index}`,
				cell: agent.pos,
				color: agent.kind === 0 ? "#1976d2" : "#2e7d32",
				label: String(index),
				big: true,
			}),
		);

	const renderOtherAgents = () =>
		(dayInformation?.others || []).flatMap((other, teamIndex) =>
			other.agents.map((agent, index) =>
				renderAgentToken({
					key: `other-${other.id}-${index}`,
					cell: agent.pos,
					color: OTHER_TEAM_COLORS[teamIndex % OTHER_TEAM_COLORS.length],
					label: String(index),
					offset: 1,
				}),
			),
		);

	const renderAdminTeams = () =>
		Object.entries(adminTeams || {}).flatMap(([teamId, team], teamIndex) =>
			(team.agents || []).map((agent, index) =>
				renderAgentToken({
					key: `admin-${teamId}-${index}`,
					cell: agent.cell,
					color:
						teamIndex === 0
							? "#1976d2"
							: OTHER_TEAM_COLORS[(teamIndex - 1) % OTHER_TEAM_COLORS.length],
					label: String(index),
					offset: teamIndex % 3,
				}),
			),
		);

	// -- replay rendering: per-agent movement trails + fanned-out tokens ------
	const renderReplayTrails = () =>
		(replayTeams || []).flatMap((team, ti) =>
			team.agents.map((agent, ai) => {
				const trail = agent.trail || [];
				if (trail.length < 2) return null;
				const points = trail
					.map((cell) => {
						const { x, y } = centerOf(cell);
						return `${x},${y}`;
					})
					.join(" ");
				return (
					<polyline
						key={`trail-${ti}-${ai}`}
						points={points}
						fill="none"
						stroke={team.color}
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
						strokeDasharray="1 4"
						opacity={0.55}
					/>
				);
			}),
		);

	const renderReplayTokens = () => {
		// Group every team's agents by the cell they occupy this step, then fan
		// them out around the cell centre so nothing stacks into an unreadable blob.
		const byCell = {};
		(replayTeams || []).forEach((team, ti) => {
			team.agents.forEach((agent, ai) => {
				(byCell[agent.cell] ||= []).push({ team, ti, agent, ai });
			});
		});
		return Object.entries(byCell).flatMap(([cell, occupants]) => {
			const { x, y } = centerOf(Number(cell));
			const n = occupants.length;
			const r = radius * (n > 4 ? 0.3 : 0.38);
			const dist = n === 1 ? 0 : radius * 0.44;
			return occupants.map((o, k) => {
				const angle = (2 * Math.PI * k) / n - Math.PI / 2;
				const cx = x + Math.cos(angle) * dist;
				const cy = y + Math.sin(angle) * dist;
				const isRefuel = o.agent.kind === 1;
				return (
					<g key={`rt-${o.ti}-${o.ai}`}>
						<circle
							cx={cx}
							cy={cy}
							r={r}
							fill={isRefuel ? "#ffffff" : o.team.color}
							stroke={o.team.color}
							strokeWidth={2.4}
						/>
						<text
							x={cx}
							y={cy + r * 0.55}
							textAnchor="middle"
							fontSize={r * 1.2}
							fontWeight="bold"
							fill={isRefuel ? o.team.color : "#ffffff"}
						>
							{o.ai}
						</text>
						<title>{`${o.team.label || o.team.teamId} · ${isRefuel ? "refuel" : "patrol"} #${o.ai}`}</title>
					</g>
				);
			});
		});
	};

	const renderHighlights = () =>
		[...highlight].map((cell) => {
			const { x, y } = centerOf(cell);
			return (
				<circle
					key={`hl-${cell}`}
					cx={x}
					cy={y}
					r={radius * 0.95}
					fill="none"
					stroke="#d32f2f"
					strokeWidth={2.4}
					opacity={0.9}
				/>
			);
		});

	const renderPaths = () =>
		Object.entries(paths).map(([agentIndex, cellPath]) => {
			if (!cellPath || cellPath.length < 2) return null;
			const points = cellPath
				.map((cell) => {
					const { x, y } = centerOf(cell);
					return `${x},${y}`;
				})
				.join(" ");
			const active = String(selectedAgent) === String(agentIndex);
			return (
				<polyline
					key={`path-${agentIndex}`}
					points={points}
					fill="none"
					stroke={active ? "#d32f2f" : "#7b1fa2"}
					strokeWidth={active ? 2.4 : 1.4}
					strokeDasharray={active ? "" : "4 3"}
					opacity={active ? 0.95 : 0.6}
				/>
			);
		});

	return (
		<Box>
			<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ mb: 0.5 }}>
				<IconButton
					aria-label={tr({ id: "hexudon.zoom.out" })}
					disabled={zoom <= ZOOM_MIN}
					onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP))}
				>
					<ZoomOutIcon fontSize="small" />
				</IconButton>
				<Tooltip title={tr({ id: "hexudon.zoom.reset" })}>
					<Typography
						variant="caption"
						role="button"
						sx={{
							minWidth: 42,
							textAlign: "center",
							cursor: "pointer",
							userSelect: "none",
							fontVariantNumeric: "tabular-nums",
						}}
						onClick={() => setZoom(1)}
					>
						{Math.round(zoom * 100)}%
					</Typography>
				</Tooltip>
				<IconButton
					aria-label={tr({ id: "hexudon.zoom.in" })}
					disabled={zoom >= ZOOM_MAX}
					onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP))}
				>
					<ZoomInIcon fontSize="small" />
				</IconButton>
			</Stack>
			<Box sx={{ overflow: "auto", maxHeight: "70vh", border: "1px solid #ddd", borderRadius: 1, bgcolor: "#f4f9f0" }}>
				<Box sx={{ width: "fit-content", mx: "auto", display: "flex" }}>
					<svg width={svgWidth} height={svgHeight}>
					{renderCells()}
					{renderSpots()}
					{renderHighlights()}
					{replayTeams ? renderReplayTrails() : renderPaths()}
					{replayTeams ? (
						renderReplayTokens()
					) : (
						<>
							{adminTeams ? renderAdminTeams() : null}
							{!adminTeams && renderOtherAgents()}
							{!adminTeams && renderOwnAgents()}
						</>
					)}
					</svg>
				</Box>
			</Box>
			<Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
				{LEGEND.map(([color, labelKey]) => (
					<Stack key={labelKey} direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ width: 12, height: 12, bgcolor: color, border: "1px solid #999", borderRadius: "3px" }} />
						<Typography variant="caption">{tr({ id: labelKey })}</Typography>
					</Stack>
				))}
				<Stack direction="row" spacing={0.5} alignItems="center">
					<Box sx={{ width: 12, height: 12, bgcolor: "#fff59d", border: "1px solid #f9a825", borderRadius: "50%" }} />
					<Typography variant="caption">{tr({ id: "hexudon.legend.spot" })}</Typography>
				</Stack>
				{!replayTeams && (
					<>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Box sx={{ width: 12, height: 12, bgcolor: "#1976d2", borderRadius: "50%" }} />
							<Typography variant="caption">{tr({ id: "hexudon.patrol" })}</Typography>
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Box sx={{ width: 12, height: 12, bgcolor: "#2e7d32", borderRadius: "50%" }} />
							<Typography variant="caption">{tr({ id: "hexudon.refuel" })}</Typography>
						</Stack>
					</>
				)}
			</Stack>
		</Box>
	);
};

export default HexBoard;
