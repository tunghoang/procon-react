import React from "react";
import "./board.css";

export default function GameBoard({
  board,
  goal,
  step = {},
  type = "default",
}) {
  if (!board) return null;
  if (type == "compare") {
    if (!goal) return null;

    const _getDieFromIdx = (dIdx) => {
      const dieSizes = [1, 2, 4, 8, 16, 32, 64, 128, 256];
      const dSize = dieSizes[Math.floor((dIdx + 2) / 3)];
      const dType = (dIdx + 2) % 3;

      const die = [[]];
      for (let i = 0; i < dSize; i++) {
        die[i] = [];
        for (let j = 0; j < dSize; j++) {
          if (dType === 0) die[i][j] = 1;
          else if (dType === 1 && i % 2 === 0) die[i][j] = 1;
          else if (dType === 2 && j % 2 === 0) die[i][j] = 1;
          else die[i][j] = 0;
        }
      }
      return die;
    };

    const die = _getDieFromIdx(step.p);
    const dh = die.length;
    const dw = die[0]?.length;

    return (
      <div className="GameBoard">
        {board.map((row, ridx) => {
          return (
            <div key={ridx} style={{ display: "flex" }}>
              {row.map((col, cidx) => {
                let className = "cell";

                if (goal[ridx][cidx] !== col) className += " cell-wrong";
                else className += " cell-correct";

                if (
                  cidx >= step.x &&
                  cidx < step.x + dw &&
                  ridx >= step.y &&
                  ridx < step.y + dh
                ) {
                  className += " cell-border";
                  if (die[ridx - step.y][cidx - step.x] === 1) {
                    if (step.s === 0) className += " cell-up";
                    if (step.s === 1) className += " cell-bottom";
                    if (step.s === 2) className += " cell-right";
                    if (step.s === 3) className += " cell-left";
                  }
                }

                return (
                  <div className={className} key={cidx}>
                    {col}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="GameBoard">
      {board.map((row, ridx) => {
        return (
          <div key={ridx} style={{ display: "flex" }}>
            {row.map((col, cidx) => {
              return (
                <div className={`cell cell-${col}`} key={cidx}>
                  {col}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
