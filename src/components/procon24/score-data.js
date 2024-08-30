import "./score.css";

const ScoreData = ({ score, onlyFinal = false }) => {
  const renderScores = (scoreData) => {
    const scores = JSON.parse(scoreData || "{}");
    const percentage = scores?.match_count / scores?.max_match_count;

    if (onlyFinal)
      return (
        <span
          className="scores"
          style={{
            textAlign: "center",
            fontSize: "45px",
            width: "100%",
            display: "inline-block",
          }}
        >
          <span className="final-score">
            {!isNaN(percentage) ? `${(percentage * 100).toFixed(2)}%` : "NA"}
          </span>
        </span>
      );

    return (
      <span className="scores">
        <span className="final-score">
          {!isNaN(scores?.final_score) ? scores.final_score : "NA"}
        </span>
        <span className="raw-score">
          {!isNaN(percentage) ? `${(percentage * 100).toFixed(0)}%` : "NA"}
        </span>
        <span className="penalty-score">
          {!isNaN(scores?.step_penalty) ? scores?.step_penalty : "NA"}
        </span>
        <span className="penalty-score">
          {!isNaN(scores?.resubmission_penalty)
            ? scores?.resubmission_penalty
            : "NA"}
        </span>
        <span className="max-score">
          {!isNaN(scores?.max_match_count) ? scores?.max_match_count : "NA"}
        </span>
      </span>
    );
  };
  return <span className="ScoreData">{renderScores(score)}</span>;
};

export default ScoreData;
