import {
  Button,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

const FilterBar = ({ onFilter, filterOptions }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const [filterData, setFilterData] = useState(
    filterOptions.map((option) => {
      return {
        ...option,
        isSelected: false,
        filterValue: "",
      };
    })
  );
  const [isFilter, setIsFilter] = useState(false);

  useEffect(() => {
    setIsFilter(
      filterData.reduce((cur, next) => cur || next.isSelected, false)
    );
  }, [filterData]);

  const handleFilter = () => {
    const query = filterData.reduce((cur, next) => {
      if (next.filterValue || next.filterValue === 0) {
        return {
          ...cur,
          [next.key]: next.filterValue,
        };
      } else return cur;
    }, {});
    onFilter && onFilter(query);
  };

  const resetFilter = () => {
    setFilterData(
      filterOptions.map((option) => {
        return {
          ...option,
          isSelected: false,
          filterValue: "",
        };
      })
    );
    onFilter && onFilter({});
  };

  return (
    <>
      <Stack direction={"row"} spacing={2}>
        <Button onClick={handleClick} startIcon={<FilterAltIcon />}>
          Filter
        </Button>
        {filterData.map((filter, idx) => {
          if (!filter.isSelected) return null;
          return (
            <FilterItem
              key={idx}
              type={filter.type}
              filter={filter}
              handleFilter={handleFilter}
              setFilterData={() => setFilterData([...filterData])}
            />
          );
        })}
        {isFilter && (
          <Stack spacing={1} direction="row" justifyContent={"center"}>
            <IconButton onClick={handleFilter} size={"small"}>
              <SearchIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={resetFilter} size={"small"}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {filterData.map((filter, idx) => {
          return (
            <MenuItem key={idx} sx={{ p: 0, pr: 1 }}>
              <Checkbox
                size="small"
                checked={filter.isSelected}
                onChange={(e) => {
                  filter.isSelected = e.target.checked;
                  if (!filter.isSelected) {
                    filter.filterValue = "";
                    handleFilter();
                  }

                  setFilterData([...filterData]);
                }}
              />
              <span style={{ fontSize: "0.9em" }}>{filter.label}</span>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

const FilterItem = ({ type, filter, setFilterData, handleFilter }) => {
  switch (type) {
    case "boolean":
      return (
        <Select
          value={filter.filterValue}
          onChange={(evt) => {
            filter.filterValue = evt.target.value;
            setFilterData();
          }}
          variant="standard"
          displayEmpty
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="" sx={{ opacity: 0.6, fontSize: 14 }}>
            <em style={{ opacity: 0.4 }}>Search by {filter.label}</em>
          </MenuItem>
          {filter.options.map((opt, idx) => (
            <MenuItem key={idx} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      );
    default:
      return (
        <TextField
          value={filter.filterValue}
          onChange={(evt) => {
            filter.filterValue = evt.target.value;
            setFilterData();
          }}
          onKeyDown={(e) => {
            if (e.key == "Enter") handleFilter();
          }}
          placeholder={`Search by ${filter.label}`}
          variant="standard"
        />
      );
  }
};

export default FilterBar;
