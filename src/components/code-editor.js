import React, { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Stack, Typography } from "@mui/material";

export default function CodeEditor({
  title,
  onValueChange,
  defaultValue = "{}",
  readOnly = false,
}) {
  const [code, setCode] = useState("");
  const [validate, setValidate] = useState("");

  useEffect(() => {
    if (!defaultValue) return;
    let value = "";
    switch (typeof defaultValue) {
      case "string":
        value = JSON.stringify(JSON.parse(defaultValue), null, 2);
        break;
      case "object":
        value = JSON.stringify(defaultValue, null, 2);
        break;
    }

    setCode(value);
  }, []);

  const onChange = (code) => {
    try {
      if (code) {
        const data = JSON.parse(code);
        onValueChange && onValueChange(data);
      }
      setValidate("");
    } catch (err) {
      setValidate(err.message);
    } finally {
      setCode(code);
    }
  };

  return (
    <Stack spacing={1} height="320px">
      <Typography variant="h6">{title}</Typography>
      <CodeMirror
        value={code}
        height="280px"
        extensions={[json()]}
        onChange={onChange}
        placeholder="Please enter JSON code"
        readOnly={readOnly}
      />
      <div style={{ color: "red" }}>{validate}</div>
    </Stack>
  );
}
