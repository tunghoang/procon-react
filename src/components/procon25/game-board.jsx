import "./board.css";
import { Stack } from "@mui/material";

const GameBoard = ({ board, step = {} }) => {
  if (!board) return null;

  const { x = -1, y = -1, n = 0 } = step;
  const size = board.length;

  // Create a correctness matrix
  const correctMap = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Mark correct pairs (both cells in pair)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      // Horizontal pair
      if (j + 1 < size && board[i][j] === board[i][j + 1]) {
        correctMap[i][j] = true;
        correctMap[i][j + 1] = true;
      }
      // Vertical pair
      if (i + 1 < size && board[i][j] === board[i + 1][j]) {
        correctMap[i][j] = true;
        correctMap[i + 1][j] = true;
      }
    }
  }

  const renderGameBoard = () =>
    board.map((row, ridx) => (
      <div key={ridx} style={{ display: "flex", justifyContent: "center" }}>
        {row.map((col, cidx) => {
          let className = "cell";

          // highlight correctness
          className += correctMap[ridx][cidx]
            ? " cell-correct"
            : " cell-wrong";

          // highlight rotated area
          if (
            x >= 0 &&
            y >= 0 &&
            cidx >= x &&
            cidx < x + n &&
            ridx >= y &&
            ridx < y + n
          ) {
            className += " cell-border rotating";
          }

          return (
            <div className={className} key={cidx}>
              {col}
            </div>
          );
        })}
      </div>
    ));

  return (
    <Stack spacing={2}>
      <div className="GameBoard">{renderGameBoard()}</div>
    </Stack>
  );
};

export default GameBoard;
