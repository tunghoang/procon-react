import "./board.css";
import { Stack } from "@mui/material";
import { useMemo, memo, useState, useEffect, useRef } from "react";
import { rotateSubBoard } from "./game-handler";

const GameBoard = ({
	board,
	step = {},
	cellSize,
	fillContainer = false,
	animate = true,
}) => {
	if (!board) return null;

	const { x = -1, y = -1, n = 0 } = step;
	const rows = board.length;
	const cols = board[0]?.length || 0;

	// mark matching horizontal/vertical pairs - memoized
	const finalMap = useMemo(() => {
		const map = Array.from({ length: rows }, () => Array(cols).fill(false));
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (j + 1 < cols && board[i][j] === board[i][j + 1]) {
					map[i][j] = map[i][j + 1] = true;
				}
				if (i + 1 < rows && board[i][j] === board[i + 1][j]) {
					map[i][j] = map[i + 1][j] = true;
				}
			}
		}
		return map;
	}, [board, rows, cols]);

	const [displayMap, setDisplayMap] = useState(finalMap);
	const prevMapRef = useRef(finalMap);

	useEffect(() => {
		// If animating and we have a previous map and a rotation occurred
		if (animate && prevMapRef.current && n > 0) {
			// Clone and rotate the PREVIOUS map to align with the NEW board geometry
			// This makes the cells "look" like they have their old correctness status
			const oldMapRotated = JSON.parse(JSON.stringify(prevMapRef.current));
			rotateSubBoard(oldMapRotated, x, y, n);

			// Show this old status immediately
			setDisplayMap(oldMapRotated);

			// After animation finishes (plus delay), switch to the new actual correctness
			const timer = setTimeout(() => {
				setDisplayMap(finalMap);
			}, 800); // 0.5s animation + 1s delay

			prevMapRef.current = finalMap;
			return () => clearTimeout(timer);
		} else {
			// No animation or initial load: show correct map immediately
			setDisplayMap(finalMap);
			prevMapRef.current = finalMap;
		}
	}, [finalMap, animate, x, y, n]);

	// render logic: when we hit (y,x) and a valid n, render subboard wrapper - memoized
	const gridElements = useMemo(() => {
		// Use displayMap for colors, if not ready yet fallback to finalMap
		const currentCorrectMap = displayMap || finalMap;

		const out = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				// if this position is top-left of subboard -> render the subboard block
				if (r === y && c === x && x >= 0 && y >= 0 && n > 0) {
					// build subboard inner cells
					const subCells = [];
					for (let sr = 0; sr < n; sr++) {
						for (let sc = 0; sc < n; sc++) {
							const rr = y + sr;
							const cc = x + sc;
							const isCorrect = currentCorrectMap[rr][cc];
							const cls = `cell ${isCorrect ? "cell-correct" : "cell-wrong"}`;
							subCells.push(
								<div className={cls} key={`sub-${sr}-${sc}`}>
									{board[rr][cc]}
								</div>
							);
						}
					}

					out.push(
						<div
							className={`subboard-wrapper ${animate ? "rotating" : ""}`}
							key={`subboard-${r}-${c}`}
							style={{
								gridRow: `${r + 1} / span ${n}`,
								gridColumn: `${c + 1} / span ${n}`,
								display: "grid",
								gridTemplateColumns: `repeat(${n}, 1fr)`,
								gridAutoRows: "1fr",
							}}>
							{subCells}
						</div>
					);

					// skip the next (n-1) columns in this row (they are inside the subboard)
					c += n - 1;
				} else {
					// check if this cell is covered by subboard but not top-left => skip (already rendered)
					if (r >= y && r < y + n && c >= x && c < x + n) {
						// covered by subboard rendered earlier; skip
						continue;
					}

					const isCorrect = currentCorrectMap[r][c];
					const cls = `cell ${isCorrect ? "cell-correct" : "cell-wrong"}`;
					out.push(
						<div
							className={cls}
							key={`cell-${r}-${c}`}
							style={{ gridRow: r + 1, gridColumn: c + 1 }}>
							{board[r][c]}
						</div>
					);
				}
			}
		}
		return out;
	}, [board, displayMap, finalMap, rows, cols, x, y, n]);

	const screenSize = useMemo(() => {
		if (cellSize) return `${cellSize * cols}px`;
		if (fillContainer) return "100%";
		// Dynamic sizing based on board size to fit screen
		// Assuming dialog takes ~350px for left panel and padding
		const maxHeight = "100vh";
		const maxWidth = "calc(100vw - 350px)";
		return `min(${maxHeight}, ${maxWidth})`;
	}, [rows, cols, cellSize, fillContainer]);

	const containerStyle = fillContainer
		? {
				width: "100%",
				height: "auto",
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
		  }
		: {};

	// Calculate size for fillContainer mode
	const boardStyle = useMemo(() => {
		if (!fillContainer) {
			return {
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				width: screenSize,
				height: screenSize,
			};
		}
		// fillContainer mode: fit to available space while maintaining aspect ratio
		// Board is square (rows === cols typically), so use full available height
		const availableHeight = "calc(90vh - 100px)"; // dialog height minus header/padding
		return {
			gridTemplateColumns: `repeat(${cols}, 1fr)`,
			height: "85%",
			maxWidth: "100%",
			maxHeight: "100%",
		};
	}, [fillContainer, cols, rows, screenSize]);

	return (
		<Stack
			spacing={0}
			style={{
				alignItems: "center",
				justifyContent: "flex-start",
				height: "100%",
			}}
			sx={containerStyle}>
			<div className="GameBoard" style={boardStyle}>
				{gridElements}
			</div>
		</Stack>
	);
};

// Wrap with memo to prevent unnecessary re-renders
export default memo(GameBoard);
