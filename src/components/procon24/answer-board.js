import { Slider } from "@mui/material";
import GameBoard from "./game-board";
import { useEffect, useState } from "react";
import { api, getError, showMessage } from "../../api/commons";

const AnswerBoard = ({ answerId, startBoard, goalBoard, onChange }) => {
  const [answer, setAnswer] = useState({});
  const [maxStep, setMaxStep] = useState(0);
  const [answerBoard, setAnswerBoard] = useState(startBoard);
  const [currentStep, setCurrentStep] = useState({});

  const _dieCutting = (coord, dir, die, board) => {
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

  const _getAnswerBoard = (stepIdx, steps) => {
    let tmpBoard = JSON.parse(JSON.stringify(startBoard));
    for (let i = 0; i < stepIdx; i++) {
      let { x, y, s, p } = steps[i];
      _dieCutting([x, y], s, _getDieFromIdx(p), tmpBoard);
    }
    return tmpBoard;
  };

  const _getCorrectCount = (curBoard, goal) => {
    let corr = 0;
    curBoard.forEach((row, ridx) => {
      row.forEach((item, cidx) => {
        if (item === goal[ridx][cidx]) corr += 1;
      });
    });

    return corr;
  };

  const getAnswer = async () => {
    try {
      const result = await api.get(
        `${process.env.REACT_APP_SERVICE_API}/answer/${answerId}`
      );
      const ansData = JSON.parse(result.answer_data || "{}");
      setMaxStep(ansData.n);
      setAnswer(result);
    } catch (e) {
      showMessage(getError(e), "error");
    }
  };

  const handleBoardChange = (val) => {
    const ops = JSON.parse(answer.answer_data || "{}").ops || [];
    const score = JSON.parse(answer.score_data || "{}");

    const curBoard = _getAnswerBoard(val, ops);
    const matchCnt = _getCorrectCount(curBoard, goalBoard);

    score.match_count = matchCnt;
    score.match_score = matchCnt * score.match_factor;
    score.final_score =
      score.match_score + score.step_penalty + score.resubmission_penalty;
    score.submit_time = new Date(answer.updatedAt).toLocaleString();

    onChange(score);
    setAnswerBoard(curBoard);
    setCurrentStep(ops[val] || {});
  };

  useEffect(() => {
    getAnswer();
  }, [answerId]);

  useEffect(() => {
    handleBoardChange(maxStep);
  }, [answer]);

  return (
    <>
      {!!maxStep && (
        <Slider
          onChange={(_, val) => handleBoardChange(val)}
          defaultValue={maxStep}
          step={1}
          min={0}
          max={maxStep}
          valueLabelDisplay="auto"
        />
      )}
      <GameBoard
        board={answerBoard}
        goal={goalBoard}
        step={currentStep}
        type="compare"
      />
    </>
  );
};

export default AnswerBoard;
