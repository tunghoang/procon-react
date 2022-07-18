import {
  Stack,
  TextField,
  IconButton,
  FormControl,
  FormLabel,
  Box,
  Select,
  MenuItem,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
export default function DynamicInput({ data, inputChange, label }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const arr = [];
    for (const key in data) {
      arr.push({
        key,
        name: data[key],
        nameType: typeof data[key],
      });
    }
    arr.push({
      key: "",
      name: "",
      nameType: "string",
    });
    setFields(arr);
  }, [data]);

  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      {fields.map((field, idx) => {
        return (
          <Stack key={idx} direction="row" alignItems={"flex-end"} spacing={2}>
            <TextField
              variant="standard"
              label="Key"
              value={field.key}
              onChange={(evt) => {
                field.key = evt.target.value;
                inputChange(fields.filter((field) => field.key));
                setFields([...fields]);
              }}
            />
            <span> = </span>
            <TextField
              variant="standard"
              label="Name"
              value={field.name}
              onChange={(evt) => {
                field.name =
                  field.nameType === "object"
                    ? evt.target.value.split(",")
                    : evt.target.value;
                console.log(field);
                inputChange(fields.filter((field) => field.key));
                setFields([...fields]);
              }}
            />
            <FormControl sx={{ width: 120 }}>
              <Select
                variant="standard"
                value={field.nameType}
                label="Type"
                onChange={(evt) => {
                  field.nameType = evt.target.value;
                  setFields([...fields]);
                }}
              >
                <MenuItem value={"string"}>String</MenuItem>
                <MenuItem value={"object"}>Array</MenuItem>
              </Select>
            </FormControl>

            <Box display={"flex"}>
              <IconButton
                onClick={() => {
                  if (fields.length >= 5) return;
                  setFields([...fields, { key: "", name: "" }]);
                }}
                size="small"
              >
                <AddIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => {
                  if (fields.length <= 1) return;
                  setFields((item) => {
                    item.splice(idx, 1);
                    return [...item];
                  });
                }}
              >
                <RemoveIcon />
              </IconButton>
            </Box>
          </Stack>
        );
      })}
    </FormControl>
  );
}
