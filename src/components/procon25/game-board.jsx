import "./board.css";
import { Stack } from "@mui/material";

const GameBoard = ({ board, step = {} }) => {
  if (!board) return null;

  const { x = -1, y = -1, n = 0 } = step;
  const rows = board.length;
  const cols = board[0]?.length || 0;

  // mark matching horizontal/vertical pairs
  const correctMap = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (j + 1 < cols && board[i][j] === board[i][j + 1]) {
        correctMap[i][j] = correctMap[i][j + 1] = true;
      }
      if (i + 1 < rows && board[i][j] === board[i + 1][j]) {
        correctMap[i][j] = correctMap[i + 1][j] = true;
      }
    }
  }

  // render logic: when we hit (y,x) and a valid n, render subboard wrapper
  const renderGrid = () => {
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
              const isCorrect = correctMap[rr][cc];
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
              className="subboard-wrapper rotating" /* add/remove rotating class as needed */
              key={`subboard-${r}-${c}`}
              style={{
                gridRow: `${r + 1} / span ${n}`,
                gridColumn: `${c + 1} / span ${n}`,
                display: "grid",
                gridTemplateColumns: `repeat(${n}, 1fr)`,
                gridAutoRows: "1fr",
              }}
            >
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

          const isCorrect = correctMap[r][c];
          const cls = `cell ${isCorrect ? "cell-correct" : "cell-wrong"}`;
          out.push(
            <div
              className={cls}
              key={`cell-${r}-${c}`}
              style={{ gridRow: r + 1, gridColumn: c + 1 }}
            >
              {board[r][c]}
            </div>
          );
        }
      }
    }
    return out;
  };

  return (
    <Stack spacing={2}>
      <div
        className="GameBoard"
        style={{gridTemplateColumns: `repeat(${board.length}, 1fr)`}}
      >
        {renderGrid()}
      </div>
    </Stack>
  );
};

export default GameBoard;
