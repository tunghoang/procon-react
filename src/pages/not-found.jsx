import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { navigate } from "hookrouter";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function NotFound() {
  return (
    <Box
      component="main"
      sx={{
        alignItems: "center",
        display: "flex",
        flexGrow: 1,
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 120,
              color: "error.main",
              mb: 3,
            }}
          />
          <Typography
            align="center"
            color="textPrimary"
            variant="h1"
            sx={{ mb: 2 }}
          >
            404
          </Typography>
          <Typography
            align="center"
            color="textPrimary"
            variant="h4"
            sx={{ mb: 3 }}
          >
            Page Not Found
          </Typography>
          <Typography
            align="center"
            color="textSecondary"
            variant="subtitle1"
            sx={{ mb: 4 }}
          >
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable.
          </Typography>
          <Button
            onClick={() => navigate("/")}
            variant="contained"
            size="large"
            sx={{ minWidth: 200 }}
          >
            Go to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
