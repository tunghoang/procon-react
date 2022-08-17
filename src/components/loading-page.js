import { Box, CircularProgress } from "@mui/material";
import React from "react";

export default function LoadingPage({ ...props }) {
  return (
    <Box
      sx={{
        display: "flex",
        m: "auto",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
      {...props}
    >
      <CircularProgress />
    </Box>
  );
}
