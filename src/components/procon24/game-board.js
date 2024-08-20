import React from "react";
import "./board.css";

export default function GameBoard({ board }) {
  if (!board) return null;
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
