import React from "react";
import "./board.css";

export default function GameBoard({ board, goal, type = "default" }) {
  if (!board) return null;
  if (type == "compare") {
    if (!goal) return null;
    return (
      <div className="GameBoard">
        {board.map((row, ridx) => {
          return (
            <div key={ridx} style={{ display: "flex" }}>
              {row.map((col, cidx) => {
                return (
                  <div
                    className={`cell ${
                      goal[ridx][cidx] === col ? "cell-0" : ""
                    }`}
                    key={cidx}
                  >
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
