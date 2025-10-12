import { Slider } from "@mui/material";
import GameBoard from "./game-board";
import { useEffect, useState } from "react";
import { api, getError, showMessage } from "../../api/commons";
import { formatDateTime } from "../../utils/commons";
import { debounce } from "lodash";
import { rotateSubBoard } from "./game-handler";

const AnswerBoard = ({ answerId, startBoard, onChange }) => {
  const [answer, setAnswer] = useState({});
  const [maxStep, setMaxStep] = useState(0);
  const [answerBoard, setAnswerBoard] = useState(startBoard);
  const [currentStep, setCurrentStep] = useState({});

  /** Apply rotations sequentially up to the given step index */
  const applyRotations = (stepIdx, ops) => {
    const tmpBoard = JSON.parse(JSON.stringify(startBoard));
    for (let i = 0; i < stepIdx; i++) {
      const { x, y, n } = ops[i];
      rotateSubBoard(tmpBoard, x, y, n);
    }
    return tmpBoard;
  };

  /** Count matching vertical and horizontal pairs */
  const countMatchingPairs = (board) => {
    let count = 0;
    const rows = board.length;
    const cols = board[0].length;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const current = board[i][j];
        if (j < cols - 1 && current === board[i][j + 1]) count++; // horizontal pair
        if (i < rows - 1 && current === board[i + 1][j]) count++; // vertical pair
      }
    }
    return count;
  };

  /** Fetch answer data from API */
  const getAnswer = async () => {
    try {
      const result = await api.get(
        `${import.meta.env.VITE_SERVICE_API}/answer/${answerId}`
      );
      const ansData = JSON.parse(result.answer_data || "{}");
      setMaxStep(ansData.ops?.length || 0);
      setAnswer(result);
    } catch (e) {
      showMessage(getError(e), "error");
    }
  };

  /** Handle board and score update when slider changes */
  const handleBoardChange = (val) => {
    const ops = JSON.parse(answer.answer_data || "{}").ops || [];
    const score = JSON.parse(answer.score_data || "{}");

    const curBoard = applyRotations(val, ops);
    const matchCnt = countMatchingPairs(curBoard);

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
  }, 100);

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
      <GameBoard board={answerBoard} step={currentStep} />
    </>
  );
};

export default AnswerBoard;
