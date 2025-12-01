import { styled } from "@mui/material";
import { TableContainer, TableCell, TableRow } from "@mui/material";

export const StyledGridOverlay = styled("div")(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
	"& .no-rows-primary": {
		fill: "#3D4751",
		...theme.applyStyles("light", {
			fill: "#AEB8C2",
		}),
	},
	"& .no-rows-secondary": {
		fill: "#1D2126",
		...theme.applyStyles("light", {
			fill: "#E8EAED",
		}),
	},
}));

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
	"& .MuiTable-root": {
		minWidth: 650,
		borderCollapse: "separate",
		borderSpacing: 0,
	},
	borderRadius: 12,
	boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
	border: `1px solid ${theme.palette.divider}`,
	overflow: "hidden",
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
	padding: "14px 16px",
	borderBottom: `1px solid ${theme.palette.divider}`,
	"&.tableHeader": {
		backgroundColor: theme.palette.mode === "light" ? "#7670e6ff" : "#4338ca",
		fontWeight: 600,
		fontSize: "0.8rem",
		textTransform: "uppercase",
		letterSpacing: "0.5px",
		color: "#ffffff",
		borderBottom: "none",
	},
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
	"&.tableRow": {
		transition: "background-color 0.15s ease",
		"&:hover": {
			backgroundColor: theme.palette.mode === "light" ? "#f1f5f9" : "#334155",
		},
		"&:nth-of-type(even)": {
			backgroundColor: theme.palette.mode === "light" ? "#fafbfc" : "#1a1a2e",
		},
		"&:nth-of-type(even):hover": {
			backgroundColor: theme.palette.mode === "light" ? "#f1f5f9" : "#334155",
		},
	},
	"&:last-child td, &:last-child th": {
		border: 0,
	},
	"& td": {
		fontSize: "0.875rem",
		color: theme.palette.mode === "light" ? "#334155" : "#e2e8f0",
	},
}));

export const filterInputStyles = {
	"& .MuiOutlinedInput-root": {
		fontSize: "0.875rem",
		backgroundColor: "#ffffff",
		borderRadius: "8px",
		boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
		"& fieldset": {
			borderColor: "#c7d2fe",
			borderWidth: "2px",
		},
		"&:hover fieldset": {
			borderColor: "#818cf8",
		},
		"&.Mui-focused fieldset": {
			borderColor: "#6366f1",
			borderWidth: "2px",
		},
		"& input": {
			"&::placeholder": {
				color: "#9ca3af",
				opacity: 1,
			},
		},
	},
};

export const filterRowStyles = {
	backgroundColor: "#eef2ff",
	borderBottom: "2px solid #c7d2fe",
	position: "sticky",
	top: 56, // Height of the main header row
	zIndex: 10,
	"& th": {
		backgroundColor: "#eef2ff",
		position: "sticky",
		top: 56,
		zIndex: 10,
	},
};
