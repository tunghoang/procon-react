import { Box, styled } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { NoData } from "../icons/no-data";
import FilterBar from "./filter-bar";

const DataTable = (props) => (
  <>
    {props.filterOptions && (
      <FilterBar
        filterOptions={props.filterOptions}
        onFilter={props.onFilter || null}
      />
    )}
    <DataGrid
      sx={{
        boxShadow: 2,
        borderRadius: 0,
        borderBottom: 1,
        borderColor: "#eee",
      }}
      components={{
        NoRowsOverlay: CustomNoRowsOverlay,
      }}
      getRowClassName={(params) => "tableRow"}
      checkboxSelection
      disableSelectionOnClick
      {...props}
    />
  </>
);

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
