import { DataGrid } from '@mui/x-data-grid';

const DataTable = (props) => (
  <DataGrid sx={{
        boxShadow: 2,
        borderRadius: 0,
        borderBottom: 1,
        borderColor: '#eee'
      }}
      getRowClassName={(params) => 'tableRow' }
      checkboxSelection
      {...props}
  />
)
export default DataTable;
