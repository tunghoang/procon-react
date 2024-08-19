import { useContext, useEffect } from "react";
import { Box, Container, Grid, Typography, Toolbar, Chip } from "@mui/material";
import { DashboardLayoutRoot } from "../../components/dashboard-layout";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import Context from "../../context";
import { useIntl } from "react-intl";
import { useFetchData } from "../../api";
import CardData from "../../components/card-data";
import { navigate } from "hookrouter";
import LoadingPage from "../../components/loading-page";
import { GAME_API } from "../../api/commons";

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
            <Typography variant="subtitle2">
              token: {localStorage.getItem("token")}
            </Typography>
            <Toolbar />
            <Grid container spacing={3}>
              {matches.length ? (
                matches
                  .filter((e) => e.is_active)
                  .map((match) => (
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
                        description={`${match.round.tournament.name} - ${match.round.name}`}
                        showAction={false}
                        handleSelect={() => {
                          navigate(`/competition/question`);
                          // window.open(
                          //   `${GAME_API}/compete?token=${localStorage.getItem(
                          //     "token"
                          //   )}`
                          // );
                          updateContext({ userMatch: match });
                        }}
                      />
                    </Grid>
                  ))
              ) : (
                <Typography
                  variant="h4"
                  m="auto"
                  sx={{
                    opacity: 0.3,
                    verticalAlign: "middle",
                    lineHeight: "300px",
                  }}
                >
                  No match added yet
                </Typography>
              )}
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
