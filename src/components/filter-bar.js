import {
  Button,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemText,
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
      if (next.filterValue) {
        return {
          ...cur,
          [next.key]: next.filterValue,
        };
      } else return cur;
    }, {});
    console.log(query);
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
          return (
            <div key={idx}>
              {filter.isSelected && (
                <FilterItem
                  type={filter.type}
                  filter={filter}
                  setFilterData={() => setFilterData([...filterData])}
                />
              )}
            </div>
          );
        })}
        {isFilter && (
          <>
            <IconButton onClick={handleFilter}>
              <SearchIcon />
            </IconButton>
            <IconButton onClick={resetFilter}>
              <ClearIcon />
            </IconButton>
          </>
        )}
      </Stack>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {filterData.map((filter, idx) => {
          return (
            <MenuItem key={idx}>
              <ListItemIcon>
                <Checkbox
                  checked={filter.isSelected}
                  onChange={(e) => {
                    filter.isSelected = e.target.checked;
                    if (!filter.isSelected) filter.filterValue = "";
                    setFilterData([...filterData]);
                  }}
                />
              </ListItemIcon>
              <ListItemText>{filter.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

const FilterItem = ({ type, filter, setFilterData }) => {
  switch (type) {
    case "text":
      return (
        <TextField
          value={filter.filterValue}
          onChange={(evt) => {
            filter.filterValue = evt.target.value;
            setFilterData();
          }}
          placeholder={`Search by ${filter.label}`}
          variant="standard"
        />
      );
    case "boolean":
      return (
        <Select
          value={filter.filterValue}
          label="Age"
          onChange={(evt) => {
            filter.filterValue = evt.target.value;
            setFilterData();
          }}
          placeholder={`Search by ${filter.label}`}
          variant="standard"
        >
          <MenuItem value={0}>Inactive</MenuItem>
          <MenuItem value={1}>Active</MenuItem>
        </Select>
      );
    default:
      return null;
  }
};

export default FilterBar;
