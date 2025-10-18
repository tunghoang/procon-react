import { useContext, useEffect } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Toolbar,
  Chip,
  Stack,
} from "@mui/material";
import { DashboardLayoutRoot } from "../../components/dashboard-layout";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useFetchData } from "../../api";
import { navigate } from "hookrouter";
import Context from "../../context";
import CardData from "../../components/card-data";
import LoadingPage from "../../components/loading-page";
import { formatDateTime } from "../../utils/commons";

const Competition = () => {
  const { updateContext } = useContext(Context);
  const { formatMessage: tr } = useIntl();
  const { data: matches, loading } = useFetchData({
    path: "/match",
    name: "Match",
  });

  useEffect(() => {
    updateContext({ userMatch: null });
  }, []);

  const renderMatches = () => {
    const activeMatches = matches.filter((m) => m.is_active);
    if (!activeMatches.length)
      return (
        <Typography
          variant="h4"
          m="auto"
          sx={{
            opacity: 0.3,
            verticalAlign: "middle",
            lineHeight: "300px",
          }}
        >
          No matches available
        </Typography>
      );

    return activeMatches.map((match) => (
      <Grid item key={match.id} lg={4} md={6} xs={12}>
        <CardData
          header={
            match.is_active ? (
              <Chip label="Active" color="success" />
            ) : (
              <Chip label="Inactive" />
            )
          }
          disabled={!match.is_active}
          name={match.name}
          description={
            <>
              <Stack spacing={0.5}>
                <Typography variant="body1" color="text.primary">
                  {match.description}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>Start:</strong> {formatDateTime(match.start_time)}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>End:</strong> {formatDateTime(match.end_time)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} mt={3}>
                <Chip
                  label={match.round.tournament.name}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={match.round.name}
                  color="warning"
                  variant="outlined"
                />
              </Stack>
            </>
          }
          showAction={false}
          handleSelect={() => {
            navigate(`/competition/question`);
            updateContext({ userMatch: match });
          }}
        />
      </Grid>
    ));
  };

  if (loading) return <LoadingPage />;

  return (
    <>
      <DashboardLayoutRoot style={{ paddingLeft: "0px", marginTop: "20px" }}>
        <Box
          sx={{
            display: "flex",
            flex: "1 1 auto",
            flexDirection: "column",
            width: "100%",
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h5">{tr({ id: "Matches" })}</Typography>
            <Toolbar />
            <Grid container spacing={3}>
              {renderMatches()}
            </Grid>
          </Container>
        </Box>
      </DashboardLayoutRoot>
      <DashboardNavbar
        sx={{
          left: 0,
          width: {
            lg: "100%",
          },
        }}
      />
    </>
  );
};

export default Competition;
