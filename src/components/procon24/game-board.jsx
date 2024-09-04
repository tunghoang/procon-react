import React from "react";
import "./board.css";
import { getDieFromIdx } from "./game-handler";

export default function GameBoard({ board, goal, general, step = {} }) {
  if (!board) return null;
  if (!goal) return null;

  const die = getDieFromIdx(step.p, general);
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
                  if (step.s === 2) className += " cell-left";
                  if (step.s === 3) className += " cell-right";
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
