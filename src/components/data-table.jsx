import { Stack, IconButton, Box, styled } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
	DataGrid,
	GridToolbarContainer,
	gridFilterActiveItemsLookupSelector,
	useGridApiContext,
	useGridSelector,
} from "@mui/x-data-grid";
import FilterListIcon from "@mui/icons-material/FilterList";
import { NoData } from "../icons/no-data";

function CustomToolbar({ onRefresh }) {
	return (
		<GridToolbarContainer sx={{ p: 1, justifyContent: "flex-end" }}>
			{onRefresh && (
				<IconButton onClick={onRefresh} size="small" title="Refresh">
					<RefreshIcon />
				</IconButton>
			)}
		</GridToolbarContainer>
	);
}

function ColumnHeaderWithFilter(props) {
	const { field, colDef } = props;
	const apiRef = useGridApiContext();
	const filterModel = useGridSelector(
		apiRef,
		gridFilterActiveItemsLookupSelector
	);
	const hasFilter = filterModel[field] != null;

	const handleFilterClick = (event) => {
		event.stopPropagation();
		apiRef.current.showFilterPanel(field);
	};

	if (!colDef.filterable) {
		return <span>{colDef.headerName}</span>;
	}

	return (
		<Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
			<span style={{ flex: 1 }}>{colDef.headerName}</span>
			<IconButton
				size="small"
				onClick={handleFilterClick}
				sx={{
					padding: "2px",
					color: hasFilter ? "primary.main" : "action.active",
				}}>
				<FilterListIcon fontSize="small" />
			</IconButton>
		</Box>
	);
}

const DataTable = (props) => {
	const { onRefresh, filterOptions, onFilter, columns, ...dataGridProps } =
		props;

	// Add custom header to all filterable columns
	const columnsWithFilter = columns?.map((col) => ({
		...col,
		renderHeader: col.filterable !== false ? ColumnHeaderWithFilter : undefined,
	}));

	return (
		<>
			{onRefresh && (
				<Stack
					direction="row"
					spacing={2}
					justifyContent="flex-end"
					sx={{ mb: 1 }}>
					<IconButton onClick={onRefresh} size="small" title="Refresh">
						<RefreshIcon />
					</IconButton>
				</Stack>
			)}
			<DataGrid
				sx={{
					boxShadow: 2,
					borderRadius: 0,
					borderBottom: 1,
					borderColor: "#eee",
				}}
				slots={{
					noRowsOverlay: CustomNoRowsOverlay,
				}}
				slotProps={{
					columnsPanel: {
						disableHideAllButton: true,
						disableShowAllButton: true,
					},
				}}
				getRowClassName={(params) => "tableRow"}
				checkboxSelection
				disableSelectionOnClick
				columns={columnsWithFilter}
				{...dataGridProps}
			/>
		</>
	);
};

function CustomNoRowsOverlay() {
	return (
		<StyledGridOverlay>
			<NoData fontSize="large" style={{ width: 120, height: 100 }} />
			<Box sx={{ mt: 1 }}>No Rows</Box>
		</StyledGridOverlay>
	);
}

const StyledGridOverlay = styled("div")(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
	"& .ant-empty-img-1": {
		fill: theme.palette.mode === "light" ? "#aeb8c2" : "#262626",
	},
	"& .ant-empty-img-2": {
		fill: theme.palette.mode === "light" ? "#f5f5f7" : "#595959",
	},
	"& .ant-empty-img-3": {
		fill: theme.palette.mode === "light" ? "#dce0e6" : "#434343",
	},
	"& .ant-empty-img-4": {
		fill: theme.palette.mode === "light" ? "#fff" : "#1c1c1c",
	},
	"& .ant-empty-img-5": {
		fillOpacity: theme.palette.mode === "light" ? "0.8" : "0.08",
		fill: theme.palette.mode === "light" ? "#f5f5f5" : "#fff",
	},
}));
export default DataTable;
