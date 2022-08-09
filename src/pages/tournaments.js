import { useState, useContext, useEffect } from "react";
import { Box, Container, Grid, Button, Typography } from "@mui/material";
import { DashboardLayoutRoot } from "../components/dashboard-layout";
import { DashboardNavbar } from "../components/dashboard-navbar";
import Context from "../context";
import TournamentDialog from "../dialogs/tournament";
import { useIntl } from "react-intl";
import { useApi } from "../api";
import AddIcon from "@mui/icons-material/Add";
import { navigate } from "hookrouter";
import CardData from "../components/card-data";

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentTournament, setCurrentTournament] = useState(null);
  const { updateContext } = useContext(Context);
  const { formatMessage: tr } = useIntl();
  const { apiGetAll, useConfirmDelete, apiCreate, apiEdit } = useApi(
    "/tournament",
    "Tournament"
  );

  const doInit = () => {
    (async () => {
      const res = await apiGetAll();
      if (res) setTournaments(res);
    })();
  };
  useEffect(() => {
    doInit();
    updateContext({ tournament: null, round: null });
  }, []);
  const apiDeleteTournament = useConfirmDelete();
  const handleDelete = async (tournament) => {
    const res = await apiDeleteTournament(tournament.id);
    if (res) doInit();
  };
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
            <Typography variant="h5">{tr({ id: "Tournaments" })}</Typography>
            <Box sx={{ width: "100%", textAlign: "right" }} mb={1}>
              <Button
                onClick={() => {
                  setCurrentTournament({ name: "", description: "" });
                  setShowDialog(true);
                }}
              >
                <AddIcon />
                {tr({ id: "Create" })}
              </Button>
            </Box>
            <Grid container spacing={3}>
              {tournaments.length ? (
                tournaments.map((tournament) => (
                  <Grid item key={tournament.id} lg={4} md={6} xs={12}>
                    <CardData
                      data={tournament}
                      handleDelete={() => handleDelete(tournament)}
                      handleEdit={() => {
                        setCurrentTournament(tournament);
                        setShowDialog(true);
                      }}
                      handleSelect={() => {
                        updateContext({
                          tournament,
                        });
                        navigate("/rounds");
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
                  Create new tournament
                </Typography>
              )}
            </Grid>
          </Container>
        </Box>
      </DashboardLayoutRoot>
      <TournamentDialog
        open={showDialog}
        tournament={currentTournament}
        close={() => setShowDialog(false)}
        save={async () => {
          if (currentTournament.id)
            await apiEdit(currentTournament.id, currentTournament);
          else await apiCreate(currentTournament);
          setShowDialog(false);
          doInit();
        }}
        handleChange={(change) => {
          let s = { ...currentTournament, ...change };
          setCurrentTournament(s);
        }}
      />
      <DashboardNavbar
        sx={{
          left: 0,
          width: {
            lg: "100%",
          },
        }}
      />{" "}
    </>
  );
};

export default Tournaments;
