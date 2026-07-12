// HEXUDON client-side rule helpers, mirroring the game service engine
// (production/procon26-hexudon/game_service.py, itself a port of the
// procon26 monorepo's packages/core). Keep the numbers in sync with the
// official rules — the server remains the authority.

// Official terrain codes in map configurations: Plain/Road/Mountain/Pond.
export const TERRAIN_NAMES = ["plain", "road", "mountain", "pond"];

// Official traffic status codes: Smooth/Congested/Jam.
export const TRAFFIC_NAMES = ["smooth", "congested", "jam"];

// Travel time (steps) and fuel cost, taken from the departure cell.
export const TRAVEL_TIME = { plain: 2, mountain: 3 }; // road depends on status
export const ROAD_TRAVEL_TIME = [1, 2, 4]; // by traffic status code
export const FUEL_COST = { plain: 1, road: 2, mountain: 2 };

// Official direction codes 0..5.
export const DIRECTIONS = [
	{ code: 0, key: "UL", arrow: "↖" },
	{ code: 1, key: "UR", arrow: "↗" },
	{ code: 2, key: "R", arrow: "→" },
	{ code: 3, key: "LR", arrow: "↘" },
	{ code: 4, key: "LL", arrow: "↙" },
	{ code: 5, key: "L", arrow: "←" },
];

// Per the official Q&A (Q1): with the row containing cells 0/1/2 as row 0,
// EVEN rows (0, 2, 4, ...) are shifted right. Deltas indexed by direction.
const SHIFTED_ROW_DELTAS = [
	[-1, 0], // upper-left
	[-1, 1], // upper-right
	[0, 1], // right
	[1, 1], // lower-right
	[1, 0], // lower-left
	[0, -1], // left
];
const UNSHIFTED_ROW_DELTAS = [
	[-1, -1],
	[-1, 0],
	[0, 1],
	[1, 0],
	[1, -1],
	[0, -1],
];

export const rowColOf = (cell, width) => [Math.floor(cell / width), cell % width];

export const neighborCell = (width, height, cell, direction) => {
	const [row, col] = rowColOf(cell, width);
	const deltas = row % 2 === 0 ? SHIFTED_ROW_DELTAS : UNSHIFTED_ROW_DELTAS;
	const [dr, dc] = deltas[direction];
	const nr = row + dr;
	const nc = col + dc;
	if (nr < 0 || nr >= height || nc < 0 || nc >= width) return null;
	return nr * width + nc;
};

// Flatten the official 2D `map.cells` terrain-code rows to a cell-id array.
export const flattenCells = (mapConfig) => mapConfig.map.cells.flat();

// {pos: statusCode} lookup from the official day information `traffics`.
export const trafficByPos = (dayInformation) => {
	const result = {};
	for (const t of dayInformation?.traffics || []) result[t.pos] = t.status;
	return result;
};

export const travelTimeFrom = (terrainCode, cell, traffic) => {
	const name = TERRAIN_NAMES[terrainCode];
	if (name === "road") return ROAD_TRAVEL_TIME[traffic[cell] ?? 0];
	if (name === "pond") return null;
	return TRAVEL_TIME[name];
};

/**
 * Dry-run one agent's official command list (0..5 move, negative = wait |n|)
 * from `startPos`, mirroring the server's decode: exact step accounting with
 * the current day's road conditions, pond/off-map rejection. Returns
 * {steps, path, error} — fuel feasibility stays with the server.
 */
export const simulateCommands = (mapConfig, traffic, startPos, commands) => {
	const cells = flattenCells(mapConfig);
	const width = mapConfig.map.width;
	const height = mapConfig.map.height;
	let pos = startPos;
	let steps = 0;
	const path = [startPos];

	for (let i = 0; i < commands.length; i += 1) {
		const command = commands[i];
		if (!Number.isInteger(command)) {
			return { steps, path, error: `command #${i + 1} must be an integer` };
		}
		if (command <= -1) {
			steps += Math.abs(command);
			continue;
		}
		if (command > 5) {
			return { steps, path, error: `command #${i + 1} must be 0..5 or a negative wait` };
		}
		const target = neighborCell(width, height, pos, command);
		if (target === null) {
			return { steps, path, error: `command #${i + 1} moves outside the map` };
		}
		if (TERRAIN_NAMES[cells[target]] === "pond") {
			return { steps, path, error: `command #${i + 1} moves into a pond` };
		}
		const travel = travelTimeFrom(cells[pos], pos, traffic);
		if (travel === null) {
			return { steps, path, error: `command #${i + 1} departs an impassable cell` };
		}
		steps += travel;
		pos = target;
		path.push(target);
	}
	return { steps, path, error: null };
};

/**
 * Validate a whole official day plan (number[][]) client-side: one command
 * array per agent, each consuming exactly `requiredSteps`. Returns a list of
 * per-agent results plus an overall `valid` flag.
 */
export const validatePlan = (mapConfig, dayInformation, plan, requiredSteps) => {
	const agents = dayInformation?.agents || [];
	const traffic = trafficByPos(dayInformation);
	if (!Array.isArray(plan) || plan.length !== agents.length) {
		return {
			valid: false,
			error: `plan must contain exactly ${agents.length} agent command arrays`,
			agents: [],
		};
	}
	const results = agents.map((agent, index) => {
		const commands = plan[index];
		if (!Array.isArray(commands)) {
			return { steps: 0, path: [agent.pos], error: "must be an array" };
		}
		const result = simulateCommands(mapConfig, traffic, agent.pos, commands);
		if (!result.error && result.steps !== requiredSteps) {
			result.error = `consumes ${result.steps} steps; the day requires exactly ${requiredSteps}`;
		}
		return result;
	});
	return {
		valid: results.every((r) => !r.error),
		error: null,
		agents: results,
	};
};

// Convert a game-service board (the /board output and /game/init body shape:
// P/M/O/R char cells, spots with chain names) into the official
// map-configuration shape that HexBoard renders.
const TERRAIN_CODE_FROM_CHAR = { P: 0, R: 1, M: 2, O: 3 };

export const boardToMapConfig = (board) => {
	const chains = [...new Set((board.spots || []).map((s) => s.chain))].sort();
	const rows = [];
	for (let row = 0; row < board.height; row += 1) {
		rows.push(
			board.cells
				.slice(row * board.width, (row + 1) * board.width)
				.map((c) => TERRAIN_CODE_FROM_CHAR[String(c).toUpperCase()] ?? 0),
		);
	}
	return {
		map: { width: board.width, height: board.height, cells: rows },
		spots: (board.spots || []).map((s) => ({
			brand: chains.indexOf(s.chain),
			pos: s.cell,
			stocks: s.max_stock,
		})),
		agents: (board.agents || []).map((a) => a.start_cell),
		fuelLimits: board.max_fuel,
		busyThreshold: board.congestion_threshold,
		jammedThreshold: board.jam_threshold,
	};
};

// Pointy-top hexagon geometry; even rows render shifted half a cell right,
// matching the rule engine's adjacency.
export const hexLayout = (radius) => {
	const width = Math.sqrt(3) * radius;
	return {
		width,
		yStep: 1.5 * radius,
		center: (row, col) => ({
			x: col * width + (row % 2 === 0 ? width / 2 : 0) + width,
			y: row * 1.5 * radius + 2 * radius,
		}),
		corners: (cx, cy) => {
			const points = [];
			for (let i = 0; i < 6; i += 1) {
				const angle = (Math.PI / 180) * (60 * i - 30);
				points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
			}
			return points.join(" ");
		},
	};
};
