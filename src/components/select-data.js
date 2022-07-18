import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React, { useState } from "react";

export default function SelectData({ label, onChange, data, props }) {
  const [value, setValue] = useState("");
  return (
    <FormControl variant="standard" sx={{ m: 0 }} fullWidth {...props}>
      <InputLabel>{label}</InputLabel>
      <Select
        fullWidth
        variant="standard"
        value={value}
        onChange={(evt) => {
          setValue(evt.target.value);
          onChange({ value: evt.target.value });
        }}
        label="Teams"
      >
        <MenuItem value={""}>
          <em style={{ opacity: 0.5 }}>None</em>
        </MenuItem>
        {data.map((item) => {
          return (
            <MenuItem value={item.key} key={item.key}>
              {item.value}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}
