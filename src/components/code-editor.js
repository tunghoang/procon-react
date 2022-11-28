import React, { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Box, Stack, Typography } from "@mui/material";

export default function CodeEditor({
  title,
  subTitle,
  onValueChange,
  onError,
  defaultValue = "{}",
  readOnly = false,
  height = "280px",
}) {
  const [code, setCode] = useState("");
  const [validate, setValidate] = useState("");

  useEffect(() => {
    if (!defaultValue) return;
    let value = "";
    switch (typeof defaultValue) {
      case "string":
        value = JSON.stringify(JSON.parse(defaultValue), null, 2);
        onValueChange && onValueChange(JSON.parse(defaultValue));
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
      onError && onError(err.message);
    } finally {
      setCode(code);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="h6" sx={{ opacity: 0.6, fontSize: "1rem" }}>
        {subTitle}
      </Typography>
      <CodeMirror
        value={code}
        height={height}
        extensions={[json()]}
        onChange={onChange}
        placeholder="Please enter JSON code"
        readOnly={readOnly}
      />
      <div style={{ color: "red" }}>{validate}</div>
    </Stack>
  );
}
