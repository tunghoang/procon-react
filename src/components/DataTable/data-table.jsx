import { useState, useMemo, useEffect, useRef } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
} from "@tanstack/react-table";
import * as mui from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import {
	StyledTableContainer,
	StyledTableCell,
	StyledTableRow,
	StyledGridOverlay,
	filterInputStyles,
	filterRowStyles,
} from "./styles";
import { NoData } from "../../icons/no-data";

const DataTable = (props) => {
	const {
		onRefresh,
		columns,
		rows = [],
		loading,
		onSelectionModelChange,
		showTimeFilter,
		onToggleTimeFilter,
		timeFrom,
		timeTo,
		onTimeFromChange,
		onTimeToChange,
		onTimeFilterSearch,
		onTimeFilterClear,
	} = props;

	const [sorting, setSorting] = useState([]);
	const [rowSelection, setRowSelection] = useState({});
	const [columnFilters, setColumnFilters] = useState([]);
	const [showFilters, setShowFilters] = useState(false);
	const [columnVisibility, setColumnVisibility] = useState({});
	const [anchorEl, setAnchorEl] = useState(null);
	const prevSelectionRef = useRef("");

	// Transform MUI DataGrid column format to TanStack format
	const tanstackColumns = useMemo(() => {
		const cols = [
			{
				id: "select",
				header: ({ table }) => (
					<mui.Checkbox
						checked={table.getIsAllRowsSelected()}
						indeterminate={table.getIsSomeRowsSelected()}
						onChange={table.getToggleAllRowsSelectedHandler()}
						sx={{
							color: "rgba(255,255,255,0.7)",
							"&.Mui-checked": {
								color: "#ffffff",
							},
							"&.MuiCheckbox-indeterminate": {
								color: "#ffffff",
							},
						}}
					/>
				),
				cell: ({ row }) => (
					<mui.Checkbox
						checked={row.getIsSelected()}
						disabled={!row.getCanSelect()}
						onChange={row.getToggleSelectedHandler()}
					/>
				),
				size: 50,
			},
		];

		columns?.forEach((col) => {
			const columnDef = {
				id: col.field,
				header: col.headerName,
				size: col.width || (col.flex ? col.flex * 100 : 150),
				cell: (info) => {
					if (col.renderCell) {
						return col.renderCell({
							row: info.row.original,
							value: info.getValue(),
						});
					}
					if (col.valueGetter) {
						return col.valueGetter({
							row: info.row.original,
							value: info.getValue(),
						});
					}
					return info.getValue();
				},
				enableColumnFilter: col.filterable !== false, // Allow filtering by default unless explicitly disabled
			};

			// Use accessorFn if valueGetter provided, otherwise accessorKey
			if (col.valueGetter) {
				columnDef.accessorFn = (row) =>
					col.valueGetter({ row, value: row[col.field] });
				// For columns with accessorFn, we need a custom filterFn that gets the value correctly
				columnDef.filterFn = (row, columnId, filterValue) => {
					if (!filterValue) return true;
					// Get the value using the accessorFn
					let cellValue = columnDef.accessorFn(row.original);

					// Handle nested objects (e.g., match.name)
					if (cellValue && typeof cellValue === "object") {
						cellValue =
							cellValue.name ||
							cellValue.label ||
							cellValue.id ||
							JSON.stringify(cellValue);
					}

					if (cellValue == null) return false;
					return String(cellValue)
						.toLowerCase()
						.includes(String(filterValue).toLowerCase());
				};
			} else {
				columnDef.accessorKey = col.field;
				// For regular columns, use row.getValue()
				columnDef.filterFn = (row, columnId, filterValue) => {
					if (!filterValue) return true;
					let cellValue = row.getValue(columnId);

					// Handle nested objects (e.g., match.name)
					if (cellValue && typeof cellValue === "object") {
						cellValue =
							cellValue.name ||
							cellValue.label ||
							cellValue.id ||
							JSON.stringify(cellValue);
					}

					if (cellValue == null) return false;
					return String(cellValue)
						.toLowerCase()
						.includes(String(filterValue).toLowerCase());
				};
			}

			cols.push(columnDef);
		});

		return cols;
	}, [columns]);

	const table = useReactTable({
		data: rows,
		columns: tanstackColumns,
		state: {
			sorting,
			rowSelection,
			columnFilters,
			columnVisibility,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getRowId: (row) => row.id,
	});

	// Notify parent of selection changes
	useEffect(() => {
		const selectedIds = Object.keys(rowSelection).filter(
			(key) => rowSelection[key]
		);
		const selectionKey = selectedIds.sort().join(",");

		// Only call callback if selection actually changed
		if (onSelectionModelChange && prevSelectionRef.current !== selectionKey) {
			prevSelectionRef.current = selectionKey;
			onSelectionModelChange(selectedIds);
		}
	}, [rowSelection, onSelectionModelChange]);

	const handleFilterClick = () => {
		if (onToggleTimeFilter) {
			setShowFilters(!showFilters);
			onToggleTimeFilter();
		} else {
			setShowFilters(!showFilters);
		}
	};

	return (
		<mui.Box sx={{ width: "100%", height: "100%" }}>
			<mui.Stack
				direction="row"
				spacing={2}
				justifyContent="space-between"
				alignItems="center"
				sx={{ mb: 1, paddingTop: 2, paddingBottom: 1, px: 1 }}>
				{showTimeFilter && onToggleTimeFilter ? (
					<mui.Stack direction="row" spacing={2} alignItems="center">
						<mui.Typography variant="subtitle2" sx={{ minWidth: 80 }}>
							Time Range:
						</mui.Typography>
						<mui.TextField
							label="From"
							type="datetime-local"
							size="small"
							value={timeFrom}
							onChange={(e) =>
								onTimeFromChange && onTimeFromChange(e.target.value)
							}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 220 }}
						/>
						<mui.TextField
							label="To"
							type="datetime-local"
							size="small"
							value={timeTo}
							onChange={(e) => onTimeToChange && onTimeToChange(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 220 }}
						/>
						<mui.Button
							variant="contained"
							size="small"
							onClick={() => onTimeFilterSearch && onTimeFilterSearch()}>
							Search
						</mui.Button>
						<mui.Button
							variant="outlined"
							size="small"
							onClick={() => onTimeFilterClear && onTimeFilterClear()}>
							Clear
						</mui.Button>
					</mui.Stack>
				) : (
					<mui.Box />
				)}
				<mui.Stack direction="row" spacing={2}>
					<mui.IconButton
						onClick={(e) => setAnchorEl(e.currentTarget)}
						size="small"
						title="Show/Hide Columns">
						<ViewColumnIcon />
					</mui.IconButton>
					<mui.IconButton
						onClick={handleFilterClick}
						size="small"
						title="Toggle Filters"
						color={showFilters || showTimeFilter ? "primary" : "default"}>
						<FilterListIcon />
					</mui.IconButton>
					{onRefresh && (
						<mui.IconButton onClick={onRefresh} size="small" title="Refresh">
							<RefreshIcon />
						</mui.IconButton>
					)}
				</mui.Stack>
			</mui.Stack>
			<mui.Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
				PaperProps={{
					style: {
						maxHeight: 400,
					},
				}}>
				{table.getAllLeafColumns().map((column) => {
					if (column.id === "select") return null;
					return (
						<mui.MenuItem
							key={column.id}
							onClick={() => column.toggleVisibility()}
							sx={{ py: 0.5 }}>
							<mui.Checkbox
								checked={column.getIsVisible()}
								size="small"
								sx={{ py: 0 }}
							/>
							<mui.Typography variant="body2">
								{typeof column.columnDef.header === "string"
									? column.columnDef.header
									: column.id}
							</mui.Typography>
						</mui.MenuItem>
					);
				})}
			</mui.Menu>
			<StyledTableContainer
				component={mui.Paper}
				sx={{
					boxShadow: 2,
					borderRadius: 0,
					borderBottom: 1,
					borderColor: "#eee",
					height: "calc(100% - 48px)",
					overflow: "auto",
				}}>
				{loading ? (
					<mui.Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
						}}>
						<mui.CircularProgress />
					</mui.Box>
				) : (
					<mui.Table stickyHeader>
						<mui.TableHead>
							{table.getHeaderGroups().map((headerGroup) => (
								<mui.TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<StyledTableCell
											key={header.id}
											style={{ width: header.getSize() }}
											className="tableHeader">
											{header.isPlaceholder ? null : (
												<mui.Box
													sx={{
														display: "flex",
														alignItems: "center",
														cursor: header.column.getCanSort()
															? "pointer"
															: "default",
													}}
													onClick={header.column.getToggleSortingHandler()}>
													{flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
													{header.column.getCanSort() &&
														header.column.getIsSorted() && (
															<mui.Box sx={{ ml: 1, display: "flex" }}>
																{header.column.getIsSorted() === "asc" ? (
																	<ArrowUpwardIcon fontSize="small" />
																) : (
																	<ArrowDownwardIcon fontSize="small" />
																)}
															</mui.Box>
														)}
												</mui.Box>
											)}
										</StyledTableCell>
									))}
								</mui.TableRow>
							))}
							{showFilters && (
								<mui.TableRow sx={filterRowStyles}>
									{table.getHeaderGroups()[0].headers.map((header) => (
										<StyledTableCell
											key={`filter-${header.id}`}
											sx={{ py: 1.5 }}>
											{header.id !== "select" &&
											header.column.getCanFilter() ? (
												<mui.TextField
													size="small"
													fullWidth
													placeholder={`Filter...`}
													value={header.column.getFilterValue() ?? ""}
													onChange={(e) =>
														header.column.setFilterValue(e.target.value)
													}
													variant="outlined"
													sx={filterInputStyles}
												/>
											) : null}
										</StyledTableCell>
									))}
								</mui.TableRow>
							)}
						</mui.TableHead>
						<mui.TableBody>
							{table.getRowModel().rows.length === 0 ? (
								<mui.TableRow>
									<mui.TableCell
										colSpan={table.getAllColumns().length}
										sx={{
											textAlign: "center",
											py: 4,
										}}>
										<CustomNoRowsOverlay />
									</mui.TableCell>
								</mui.TableRow>
							) : (
								table.getRowModel().rows.map((row) => (
									<StyledTableRow key={row.id} className="tableRow">
										{row.getVisibleCells().map((cell) => (
											<StyledTableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</StyledTableCell>
										))}
									</StyledTableRow>
								))
							)}
						</mui.TableBody>
					</mui.Table>
				)}
			</StyledTableContainer>
		</mui.Box>
	);
};

const CustomNoRowsOverlay = () => {
	return (
		<StyledGridOverlay>
			<NoData style={{ width: 80, height: 80, marginBottom: 16 }} />
			<mui.Typography variant="body1" color="text.secondary">
				No Rows
			</mui.Typography>
		</StyledGridOverlay>
	);
};

export default DataTable;
