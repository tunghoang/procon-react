import { Box, Slider } from "@mui/material";
import GameBoard from "./game-board";
import { useEffect, useState } from "react";
import { api, getError, showMessage } from "../../api/commons";

const AnswerBoard = ({ answerId, startBoard, goalBoard }) => {
  const [answerData, setAnswerData] = useState({});
  const [answerBoard, setAnswerBoard] = useState(startBoard);

  const dieCutting = (coord, dir, die, board) => {
    let height = board.length;
    let width = board[0].length;
    let dh = die.length;
    let dw = die[0].length;
    if (dir === 0) {
      for (let dx = 0; dx < dw; dx++) {
        let dup = 0;
        for (let dy = 0; dy < dh; dy++) {
          if (die[dy][dx] === 0) continue;
          let x = coord[0] + dx;
          let y = coord[1] + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          y -= dup;
          dup += 1;
          let val = board[y][x];
          for (let k = y; k < height - 1; k++) board[k][x] = board[k + 1][x];
          board[height - 1][x] = val;
        }
      }
    } else if (dir === 1) {
      for (let dx = 0; dx < dw; dx++) {
        let dup = 0;
        for (let dy = dh - 1; dy >= 0; dy--) {
          if (die[dy][dx] === 0) continue;
          let x = coord[0] + dx;
          let y = coord[1] + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          y += dup;
          dup += 1;
          let val = board[y][x];
          for (let k = y; k >= 1; k--) board[k][x] = board[k - 1][x];
          board[0][x] = val;
        }
      }
    } else if (dir === 2) {
      for (let dy = 0; dy < dh; dy++) {
        let dup = 0;
        for (let dx = 0; dx < dw; dx++) {
          if (die[dy][dx] === 0) continue;
          let x = coord[0] + dx;
          let y = coord[1] + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          x -= dup;
          dup += 1;
          let val = board[y][x];
          for (let k = x; k < width - 1; k++) board[y][k] = board[y][k + 1];
          board[y][width - 1] = val;
        }
      }
    } else if (dir === 3) {
      for (let dy = 0; dy < dh; dy++) {
        let dup = 0;
        for (let dx = dw - 1; dx >= 0; dx--) {
          if (die[dy][dx] === 0) continue;
          let x = coord[0] + dx;
          let y = coord[1] + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          x += dup;
          dup += 1;
          let val = board[y][x];
          for (let k = x; k >= 1; k--) board[y][k] = board[y][k - 1];
          board[y][0] = val;
        }
      }
    }
  };

  const _getDieFromIdx = (dIdx) => {
    const dieSizes = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    const dSize = dieSizes[Math.floor((dIdx + 2) / 3)];
    const dType = (dIdx + 2) % 3;

    const die = [];
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

  const getAnswer = async () => {
    try {
      const res = await api.get(
        `${process.env.REACT_APP_SERVICE_API}/answer/${answerId}`
      );
      setAnswerData(JSON.parse(res.answer_data || "{}"));
    } catch (e) {
      showMessage(getError(e), "error");
    }
  };

  const getAnswerBoard = (move) => {
    let tmpBoard = JSON.parse(JSON.stringify(startBoard));
    const ops = answerData.ops || [];
    for (let i = 0; i < move; i++) {
      let { x, y, s, p } = ops[i];
      dieCutting([x, y], s, _getDieFromIdx(p), tmpBoard);
    }
    return tmpBoard;
  };

  const handleChange = (_, val) => {
    setAnswerBoard(getAnswerBoard(val));
  };

  useEffect(() => {
    getAnswer();
  }, [answerId]);

  useEffect(() => {
    if (!answerData) return;
    setAnswerBoard(getAnswerBoard(answerData.n));
  }, [answerData]);

  return (
    <>
      {!!answerData.n && (
        <Slider
          onChange={handleChange}
          defaultValue={answerData.n}
          step={1}
          min={0}
          max={answerData.n}
          valueLabelDisplay="auto"
        />
      )}
      <GameBoard board={answerBoard} goal={goalBoard} type="compare" />
    </>
  );
};

export default AnswerBoard;
