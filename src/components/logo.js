import { Stack, Typography } from "@mui/material";
import { A } from "hookrouter";
import React from "react";
import { LogoIcon } from "./logo-icon";

export default function Logo({ ...props }) {
  return (
    <A
      href="/"
      style={{
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <Stack direction={"row"} alignItems="center" {...props}>
        <LogoIcon
          sx={{
            height: 42,
            width: 42,
          }}
        />
        <Typography ml={2} variant="h5">
          PROCON {new Date().getFullYear()}
        </Typography>
      </Stack>
    </A>
  );
}
