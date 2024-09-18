import React, { useEffect, useState } from "react";
import "./board.css";
import { getDieFromIdx } from "./game-handler";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";

const GameBoard = ({ board, goal, general, step = {}, defaultMode = 0 }) => {
  if (!board) return null;
  if (!goal) return null;

  const boardId = Date.now();
  const [mode, setMode] = useState(defaultMode);

  const die = getDieFromIdx(step.p, general);
  const dh = die.length;
  const dw = die[0]?.length;

  const cellscale = Math.round(800 / board[0].length);
  const widthscale = board[0].length * cellscale;
  const heightscale = board.length * cellscale;
  const textscale = Math.round(cellscale / 3);

  useEffect(() => {
    const layout = {
      annotations: [],
      xaxis: {
        ticks: "",
      },
      yaxis: {
        ticks: "",
        ticksuffix: " ",
        autorange: "reversed",
      },
      width: widthscale,
      height: heightscale,
      autosize: false,
    };

    let allMatch = true;
    const matchBoard = goal.map((row, rid) => {
      return row.map((item, cid) => {
        const val = board[rid][cid] - item;
        if (val === 0) return val;
        allMatch = false;
        return 1;
      });
    });

    let colorscale = [
      [0, "green"],
      [1, "red"],
    ];
    if (allMatch) {
      colorscale = [
        [0, "green"],
        [1, "green"],
      ];
    }

    const data = [
      {
        z: matchBoard,
        type: "heatmapgl",
        zsmooth: false,
        showscale: false,
        hoverinfo: "skip",
        hovertemplate:
          "<b>x</b>: %{x}" +
          "<br><b>y</b>: %{y}<br>" +
          "<b>%{text}</b>" +
          "<extra></extra>",
        text: board,
        texttemplate: "%{text}",
        textfont: { size: textscale },
        colorscale,
      },
    ];
    Plotly.newPlot(`GameBoard-${boardId}`, data, layout);
  }, [board]);

  const renderGameBoard = () => {
    const gameBoard = board.map((row, ridx) => {
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
    });
    return gameBoard;
  };

  return (
    <Stack spacing={2}>
      <FormControl style={{ width: 300 }}>
        <InputLabel>Board mode</InputLabel>
        <Select
          value={mode}
          label="Board mode"
          onChange={(e) => setMode(e.target.value)}
        >
          <MenuItem value={0}>lightweight</MenuItem>
          <MenuItem value={1}>fullscreen</MenuItem>
        </Select>
      </FormControl>
      <div
        id={`GameBoard-${boardId}`}
        style={{ display: mode !== 0 && "none" }}
      ></div>
      {mode === 1 && <div className="GameBoard"> {renderGameBoard()}</div>}
    </Stack>
  );
};

export default GameBoard;
