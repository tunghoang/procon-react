const ScoreData = ({ scores }) => {
	const isMax = scores?.match_count === scores?.max_match_count;
	return (
		<span>
			<span
				style={{
					fontStyle: "italic",
					fontWeight: "bold",
					marginRight: 10,
					color: !isMax ? "red" : "#35ae35ff",
				}}>
				{!isNaN(scores?.match_count) ? scores?.match_count : "NA"}
			</span>
			<span
				style={{
					fontStyle: "italic",
					fontWeight: "bold",
					marginRight: 10,
					color: "#35ae35ff",
				}}>
				{!isNaN(scores?.max_match_count) ? scores?.max_match_count : "NA"}
			</span>
			<span
				style={{
					fontStyle: "italic",
					fontWeight: "bold",
					marginRight: 10,
					color: "#e0941bff",
				}}>
				{!isNaN(scores?.step_count) ? scores?.step_count : "NA"}
			</span>
			<span
				style={{
					fontStyle: "italic",
					fontWeight: "bold",
					marginRight: 10,
					color: "#d648b7ff",
				}}>
				{!isNaN(scores?.resubmission_count) ? scores?.resubmission_count : "NA"}
			</span>
		</span>
	);
};

export default ScoreData;
