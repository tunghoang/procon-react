import { useState, useContext, useEffect } from "react";
import {
  Box,
  Container,
  Grid,
  Button,
  Typography,
  Toolbar,
} from "@mui/material";
import { DashboardLayoutRoot } from "../components/dashboard-layout";
import { DashboardNavbar } from "../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../api";
import { navigate } from "hookrouter";
import Context from "../context";
import RoundDialog from "../dialogs/round";
import AddIcon from "@mui/icons-material/Add";
import CardData from "../components/card-data";
import LoadingPage from "../components/loading-page";

const Rounds = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const { updateContext, tournament } = useContext(Context);
  const { apiCreate, useConfirmDelete, apiEdit } = useApi("/round", "Round");

  const { formatMessage: tr } = useIntl();
  const {
    data: rounds,
    refetch,
    loading,
  } = useFetchData({
    path: "/round",
    name: "Round",
    config: {
      params: {
        eq_tournament_id: tournament?.id,
      },
    },
  });
  useEffect(() => {
    updateContext({ round: null });
  }, []);
  const apiDeleteDialog = useConfirmDelete();
  const handleDelete = async (item) => {
    const res = await apiDeleteDialog([item.id]);
    if (res.length) refetch();
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
            <Typography variant="h5">{tr({ id: "Rounds" })}</Typography>
            <Toolbar sx={{ justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setCurrentItem({ name: "", description: "" });
                  setShowDialog(true);
                }}
              >
                <AddIcon />
                {tr({ id: "Create" })}
              </Button>
            </Toolbar>
            <Grid container spacing={3}>
              {rounds.length ? (
                rounds.map((round) => (
                  <Grid item key={round.id} lg={4} md={6} xs={12}>
                    <CardData
                      name={round.name}
                      description={round.description}
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
                  Create new round
                </Typography>
              )}
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
          refetch();
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
      />
    </>
  );
};

export default Rounds;
