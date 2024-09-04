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

  const defaultField = {
    key: "",
    name: "",
    nameType: "object",
  };

  useEffect(() => {
    const arr = [];
    const jsonData = typeof data === "string" ? JSON.parse(data) : data;
    for (const key in jsonData) {
      arr.push({
        key,
        name: Array.isArray(jsonData[key])
          ? jsonData[key].join(",")
          : jsonData[key],
        nameType: typeof jsonData[key],
      });
    }
    arr.push(defaultField);
    setFields(arr);
  }, []);

  const sendValue = () => {
    inputChange(fields.filter((field) => field.key));
    setFields([...fields]);
  };

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
                sendValue();
              }}
            />
            <span> = </span>
            <TextField
              variant="standard"
              label="Name"
              value={field.name}
              onChange={(evt) => {
                field.name = evt.target.value;
                sendValue();
              }}
            />
            <FormControl sx={{ width: 120 }}>
              <Select
                variant="standard"
                value={field.nameType}
                label="Type"
                onChange={(evt) => {
                  field.nameType = evt.target.value;
                  sendValue();
                }}
              >
                <MenuItem value={"string"}>String</MenuItem>
                <MenuItem value={"object"}>Array</MenuItem>
              </Select>
            </FormControl>

            <Box display={"flex"} sx={{ bgcolor: "#e5e7eb", borderRadius: 15 }}>
              <IconButton
                onClick={() => {
                  if (fields.length >= 5) return;
                  setFields([...fields, defaultField]);
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
