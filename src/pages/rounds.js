import { useState, useContext, useEffect } from "react";
import { Box, Container, Grid, Button, Typography } from "@mui/material";
import { DashboardLayoutRoot } from "../components/dashboard-layout";
import { DashboardNavbar } from "../components/dashboard-navbar";
import Context from "../context";
import RoundDialog from "../dialogs/round";
import { useIntl } from "react-intl";
import { useApi } from "../api";
import AddIcon from "@mui/icons-material/Add";
import { navigate } from "hookrouter";
import CardData from "../components/card-data";

const Rounds = () => {
  const [rounds, setRounds] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const { updateContext, tournament } = useContext(Context);
  const { apiGetAll, apiCreate, useConfirmDelete, apiEdit } = useApi(
    "/round",
    "Round"
  );

  const { formatMessage: tr } = useIntl();
  const doInit = () => {
    (async () => {
      const results = await apiGetAll();
      if (results) setRounds(results);
    })();
  };
  useEffect(() => {
    doInit();
    updateContext({ round: null });
  }, []);
  const apiDeleteDialog = useConfirmDelete();
  const handleDelete = async (item) => {
    const res = await apiDeleteDialog(item.id);
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
            <Typography variant="h5">{tr({ id: "Rounds" })}</Typography>
            <Box sx={{ width: "100%", textAlign: "right" }} mb={1}>
              <Button
                onClick={() => {
                  setCurrentItem({ name: "", description: "" });
                  setShowDialog(true);
                }}
              >
                <AddIcon />
                {tr({ id: "Create" })}
              </Button>
            </Box>
            <Grid container spacing={3}>
              {rounds.map((round) => (
                <Grid item key={round.id} lg={4} md={6} xs={12}>
                  <CardData
                    data={round}
                    handleDelete={() => handleDelete(round)}
                    handleEdit={() => {
                      setCurrentItem(round);
                      setShowDialog(true);
                    }}
                    handleSelect={() => {
                      updateContext({ round });
                      navigate("/teams");
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </DashboardLayoutRoot>
      <RoundDialog
        open={showDialog}
        round={currentItem}
        close={() => setShowDialog(false)}
        save={async () => {
          if (currentItem.id) await apiEdit(currentItem.id, currentItem);
          else {
            currentItem.tournament_id = tournament.id;
            await apiCreate(currentItem);
          }
          setShowDialog(false);
          doInit();
        }}
        handleChange={(change) => {
          setCurrentItem({ ...currentItem, ...change });
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

export default Rounds;
