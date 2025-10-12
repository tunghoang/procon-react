// Rotate a square subregion clockwise
export const rotateSubBoard = (board, x, y, n) => {
  // Extract sub-square
  const sub = board.slice(y, y + n).map(row => row.slice(x, x + n));

  // Rotate 90° clockwise: transpose + reverse each row
  const rotated = sub[0].map((_, i) => sub.map(row => row[i]).reverse());

  // Write back rotated values
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      board[y + i][x + j] = rotated[i][j];
    }
  }

  return board;
};
