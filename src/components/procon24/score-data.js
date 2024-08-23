import "./score.css";

const ScoreData = ({ score }) => {
  const renderScores = (scoreData) => {
    const scores = JSON.parse(scoreData || "{}");
    const finaScore = scores?.final_score / scores?.max_score;
    return (
      <span className="scores">
        <span className="final-score">
          {/* {!isNaN(scores?.final_score) ? scores.final_score : "NA"} */}
          {!isNaN(finaScore) ? (finaScore * 100).toFixed(2) : "NA"}
        </span>
        <span className="raw-score">
          {!isNaN(scores?.raw_score) ? scores?.raw_score : "NA"}
        </span>
        <span className="penalty-score">
          {!isNaN(scores?.penalties) ? scores?.penalties : "NA"}
        </span>
        <span className="penalty-score">
          {!isNaN(scores?.num_steps) ? scores?.num_steps : "NA"}
        </span>
        <span className="max-score">
          {!isNaN(scores?.max_score) ? scores?.max_score : "NA"}
        </span>
      </span>
    );
  };
  return <span className="ScoreData">{renderScores(score)}</span>;
};

export default ScoreData;
