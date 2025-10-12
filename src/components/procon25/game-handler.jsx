// Rotate a square subregion clockwise
export const rotateSubBoard = (board, x, y, n) => {
  const sub = board.slice(y, y + n).map(row => row.slice(x, x + n));
  const rotated = sub[0].map((_, idx) => sub.map(row => row[n - 1 - idx]));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      board[y + i][x + j] = rotated[i][j];
    }
  }
  return board;
};