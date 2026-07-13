// Rule-shape validation for a pasted /game/init body (the Manual tab).
// Generation itself now happens server-side (POST /game/generate, wrapping
// production/procon26-hexudon/map_gen.py's BFS/Dijkstra-verified generator)
// instead of being duplicated here in JS -- see dialogs/question.jsx.

/**
 * Structural check for a pasted /game/init body (the Manual tab). Returns a
 * list of human-readable problems; empty means it looks like a valid init.
 */
export const validateInitShape = (obj) => {
	const problems = [];
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
		return ["must be a JSON object shaped like the /game/init body"];
	}
	if (typeof obj.startsAt !== "number") problems.push("startsAt (epoch seconds) is required");
	if (!Array.isArray(obj.daySeconds) || !obj.daySeconds.length) problems.push("daySeconds must be a non-empty array");
	if (!Array.isArray(obj.daySteps) || !obj.daySteps.length) problems.push("daySteps must be a non-empty array");
	if (Array.isArray(obj.daySeconds) && Array.isArray(obj.daySteps) && obj.daySeconds.length !== obj.daySteps.length) {
		problems.push("daySeconds and daySteps must have the same length");
	}
	const map = obj.map;
	if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height) || !Array.isArray(map.cells)) {
		problems.push("map {width, height, cells} is required");
	} else {
		if (map.cells.length !== map.height || map.cells.some((row) => !Array.isArray(row) || row.length !== map.width)) {
			problems.push("map.cells must be height x width");
		}
		if (map.cells.flat?.().some((c) => ![0, 1, 2, 3].includes(c))) {
			problems.push("map cells must be 0-3");
		}
	}
	if (!Array.isArray(obj.spots)) problems.push("spots must be an array");

	// Day-structure bounds (docs): 4-10 days; steps/day in [(w+h), 4(w+h)].
	const w = map?.width;
	const h = map?.height;
	if (Array.isArray(obj.daySteps)) {
		if (obj.daySteps.length < 4 || obj.daySteps.length > 10) {
			problems.push("a match must have 4 to 10 days");
		}
		if (Number.isInteger(w) && Number.isInteger(h)) {
			const lo = w + h;
			const hi = 4 * (w + h);
			obj.daySteps.forEach((s, i) => {
				if (!(Number.isInteger(s) && s >= lo && s <= hi)) {
					problems.push(`day ${i + 1} steps must be within ${lo}..${hi}`);
				}
			});
		}
	}

	// Fuel capacity (docs E28/E29): >= 2 and within [1x, 3x] of day-1 steps.
	const day1 = Array.isArray(obj.daySteps) ? obj.daySteps[0] : undefined;
	if (!Number.isInteger(obj.fuelLimits) || obj.fuelLimits <= 0) {
		problems.push("fuelLimits must be a positive integer");
	} else if (Number.isInteger(day1)) {
		if (obj.fuelLimits < 2 || obj.fuelLimits < day1 || obj.fuelLimits > 3 * day1) {
			problems.push(`fuelLimits must be >= 2 and within [1x, 3x] of day-1 steps (${day1})`);
		}
	}

	// Thresholds (docs): busy 1-5, jammed 2-10 and greater than busy.
	if (!Number.isInteger(obj.busyThreshold) || obj.busyThreshold < 1 || obj.busyThreshold > 5) {
		problems.push("busyThreshold must be an integer 1..5");
	}
	if (
		!Number.isInteger(obj.jammedThreshold) ||
		obj.jammedThreshold < 2 ||
		obj.jammedThreshold > 10 ||
		obj.jammedThreshold <= obj.busyThreshold
	) {
		problems.push("jammedThreshold must be an integer 2..10 and greater than busyThreshold");
	}

	// Spot placement (docs): on Plain, one per cell, count in [agents, max(w,h)],
	// stock in [1, agents].
	const flat = Array.isArray(map?.cells) ? map.cells.flat() : null;
	const nAgents = Array.isArray(obj.teams?.[0]?.agents) ? obj.teams[0].agents.length : 0;
	if (Array.isArray(obj.spots) && flat) {
		const seen = new Set();
		for (const s of obj.spots) {
			if (!Number.isInteger(s?.pos) || s.pos < 0 || s.pos >= flat.length) {
				problems.push(`spot pos ${s?.pos} is out of range`);
				continue;
			}
			if (flat[s.pos] !== 0) problems.push(`spot at ${s.pos} must be on a Plain cell`);
			if (seen.has(s.pos)) problems.push(`duplicate spot at cell ${s.pos}`);
			seen.add(s.pos);
			if (nAgents && !(Number.isInteger(s.stocks) && s.stocks >= 1 && s.stocks <= nAgents)) {
				problems.push(`spot at ${s.pos} stock must be within 1..${nAgents}`);
			}
		}
		if (nAgents && (obj.spots.length < nAgents || obj.spots.length > Math.max(w, h))) {
			problems.push(`spot count must be within ${nAgents}..${Math.max(w, h)}`);
		}
	}

	// Teams + agent start cells (docs E27): 3-8 agents; distinct, on Plain,
	// spot-free; identical starting layout for every team.
	if (!Array.isArray(obj.teams) || !obj.teams.length) {
		problems.push("teams must be a non-empty array of {team_id, agents}");
	} else {
		const spotCells = new Set((obj.spots || []).map((s) => s.pos));
		const layout0 = Array.isArray(obj.teams[0]?.agents) ? obj.teams[0].agents.join(",") : null;
		obj.teams.forEach((t, i) => {
			if (!Array.isArray(t.agents) || t.agents.length < 3 || t.agents.length > 8) {
				problems.push(`teams[${i}].agents must list 3-8 start cells`);
				return;
			}
			if (new Set(t.agents).size !== t.agents.length) {
				problems.push(`teams[${i}] start cells must be distinct`);
			}
			if (flat) {
				for (const cell of t.agents) {
					if (!(Number.isInteger(cell) && cell >= 0 && cell < flat.length)) {
						problems.push(`teams[${i}] start cell ${cell} is out of range`);
					} else if (flat[cell] !== 0) {
						problems.push(`teams[${i}] start cell ${cell} must be on a Plain cell`);
					} else if (spotCells.has(cell)) {
						problems.push(`teams[${i}] start cell ${cell} must not hold a spot`);
					}
				}
			}
			if (layout0 !== null && t.agents.join(",") !== layout0) {
				problems.push(`teams[${i}] must have the same starting layout as team 0`);
			}
		});
	}

	return problems;
};
