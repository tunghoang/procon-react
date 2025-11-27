import "./score.css";

const ScoreData = ({ scores, onlyFinal = false }) => {
	const percentage = scores?.match_count / scores?.max_match_count;

	if (onlyFinal)
		return (
			<span
				className="ScoreData"
				style={{
					textAlign: "center",
					fontSize: "45px",
					width: "100%",
					display: "inline-block",
				}}>
				<span className="final-score">
					{!isNaN(percentage) ? `${(percentage * 100).toFixed(2)}%` : "NA"}
				</span>
			</span>
		);

	return (
		<span className="ScoreData">
			<span className="raw-score">
				{!isNaN(scores?.match_count) ? scores?.match_count : "NA"}
			</span>
			<span className="max-score">
				{!isNaN(scores?.max_match_count) ? scores?.max_match_count : "NA"}
			</span>
			<span className="penalty-score">
				{!isNaN(scores?.step_count) ? scores?.step_count : "NA"}
			</span>
			<span className="penalty-score">
				{!isNaN(scores?.resubmission_count) ? scores?.resubmission_count : "NA"}
			</span>
		</span>
	);
};

export default ScoreData;
