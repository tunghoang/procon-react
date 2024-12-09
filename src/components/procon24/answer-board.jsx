import { Slider } from "@mui/material";
import GameBoard from "./game-board";
import { useEffect, useState } from "react";
import { api, getError, showMessage } from "../../api/commons";
import { formatDateTime } from "../../utils/commons";
import { dieCutting, getDieFromIdx } from "./game-handler";
import { debounce } from "lodash";

const AnswerBoard = ({
  answerId,
  startBoard,
  goalBoard,
  general,
  onChange,
}) => {
  const [answer, setAnswer] = useState({});
  const [maxStep, setMaxStep] = useState(0);
  const [answerBoard, setAnswerBoard] = useState(startBoard);
  const [currentStep, setCurrentStep] = useState({});

  const _getAnswerBoard = (stepIdx, steps) => {
    let tmpBoard = JSON.parse(JSON.stringify(startBoard));
    for (let i = 0; i < stepIdx; i++) {
      let { x, y, s, p } = steps[i];
      dieCutting([x, y], s, getDieFromIdx(p, general), tmpBoard);
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
        `${import.meta.env.VITE_SERVICE_API}/answer/${answerId}`
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
    const finalScore =
      score.match_score + score.step_penalty + score.resubmission_penalty;
    score.final_score = Math.round(finalScore * 100) / 100;
    score.submitted_time = formatDateTime(
      answer.submitted_time || answer.updatedAt
    );
    score.updated_time = formatDateTime(answer.updatedAt);

    onChange(score);
    setAnswerBoard(curBoard);
    setCurrentStep(ops[val] || {});
  };

  const handleBoardChangedb = debounce((val) => {
    handleBoardChange(val);
  }, 300);

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
          onChange={(_, val) => handleBoardChangedb(val)}
          defaultValue={maxStep}
          step={1}
          min={0}
          max={maxStep}
          valueLabelDisplay="auto"
          key={maxStep}
        />
      )}
      <GameBoard
        board={answerBoard}
        goal={goalBoard}
        general={general}
        step={currentStep}
      />
    </>
  );
};

export default AnswerBoard;
