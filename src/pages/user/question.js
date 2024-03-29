import "./question.css"
import { useContext, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Toolbar,
  Button,
  Stack,
} from "@mui/material";
import { DashboardLayoutRoot } from "../../components/dashboard-layout";
import { DashboardNavbar } from "../../components/dashboard-navbar";
import { useIntl } from "react-intl";
import { useApi, useFetchData } from "../../api";
import CardData from "../../components/card-data";
import { UserAnswerDialog, ScoreDataDialog } from "../../dialogs/answer";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import DownloadIcon from "@mui/icons-material/Download";
import { SERVICE_API } from "../../api/commons";
import Context from "../../context";
import LoadingPage from "../../components/loading-page";
import { formatDateTime } from "../../utils/commons";

const UserQuestion = () => {
  const { userMatch } = useContext(Context);
  const [dialogName, setDialogName] = useState("");
  const [currentItem, setCurrentItem] = useState(null);
  const { formatMessage: tr } = useIntl();
  const { data: questions } = useFetchData({
    path: "/question",
    name: "Question",
    config: {
      params: {
        "match[eq_id]": userMatch?.id,
      },
    },
  });
  const {
    data: answers,
    refetch,
    loading,
  } = useFetchData({
    path: "/answer",
    name: "Answer",
    config: {
      params: {
        "match[eq_id]": userMatch?.id,
      },
    },
  });
  const { apiCreate, apiEdit } = useApi("/answer", "Answer");

  const closeDialog = () => {
    setDialogName("");
  };

  const saveInstance = async () => {
    let result;
    if (currentItem?.id) {
      result = await apiEdit(currentItem.id, currentItem);
    } else {
      result = await apiCreate(currentItem);
    }
    if (result) refetch();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    setCurrentItem({ ...currentItem, ...changes });
  };

  if (loading) return <LoadingPage />;

  return (
    <>
      <DashboardLayoutRoot style={{ paddingLeft: "0px", marginTop: "20px" }} className="UserQuestion">
        <Box
          sx={{
            display: "flex",
            flex: "1 1 auto",
            flexDirection: "column",
            width: "100%",
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h5">{tr({ id: "Questions" })}</Typography>
            <Toolbar sx={{ justifyContent: "flex-end" }}>
              <a
                style={{ textDecoration: "none" }}
                href={`${SERVICE_API}/question/download/resource`}
                target="_blank"
              >
                <Button>
                  <DownloadIcon /> Download Reading Cards
                </Button>
              </a>
            </Toolbar>
            <Grid container spacing={3}>
              {questions.length ? (
                questions.map((question) => {
                  const answer = answers.find(
                    (item) => item.question_id === question.id
                  );
                  const question_data = JSON.parse(question.question_data || "{}");
                  return (
                    <Grid item key={question.id} lg={4} md={6} xs={12}>
                      <CardData
                        name={question.name}
                        description={
                          <Stack alignItems={"flex-start"}>
                            <div style={{textAlign: 'left', marginBottom: '12px'}}>
                              <div className="data-item">
                                <span>Id:</span> {question.id}
                              </div>
                              <div className="data-item">
                                <span>Cards:</span> {question_data.n_cards}
                              </div>
                              <div className="data-item">
                                <span>Parts:</span> {question_data.n_parts || 2}
                              </div>
                              <div className="data-item">
                                <span>Bonus factor:</span> {question_data.bonus_factor}
                              </div>
                              <div className="data-item">
                                <span>Penalty per change:</span> {question_data.penalty_per_change}
                              </div>
                              <div className="data-item">
                                <span>Point per card:</span> {question_data.point_per_correct || 10}
                              </div>
                            </div>
                            <div>
                              Start Time: {formatDateTime(question.start_time)}
                            </div>
                            <div>
                              End Time: {formatDateTime(question.end_time)}
                            </div>
                          </Stack>
                        }
                        handleSelect={() => {
                          setDialogName("UserAnswerDialog");
                          setCurrentItem({
                            ...answer,
                            question_id: question.id,
                          });
                        }}
                        showAction={!!answer}
                        action={
                          answer && (
                            <Button
                              onClick={() => {
                                setDialogName("ScoreDataDialog");
                                setCurrentItem({
                                  ...answer,
                                  question_id: question.id,
                                });
                              }}
                            >
                              <SportsScoreIcon color="action" />
                              <Typography
                                color="textSecondary"
                                display="inline"
                                sx={{ pl: 1 }}
                                variant="body2"
                              >
                                Score
                              </Typography>
                            </Button>
                          )
                        }
                      />
                    </Grid>
                  );
                })
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
                  No question added yet
                </Typography>
              )}
            </Grid>
          </Container>
        </Box>
      </DashboardLayoutRoot>
      {dialogName === "UserAnswerDialog"?<UserAnswerDialog
        open={dialogName === "UserAnswerDialog"}
        instance={currentItem}
        close={closeDialog}
        save={saveInstance}
        handleChange={changeInstance}
      />:""}
      {dialogName === "ScoreDataDialog"?<ScoreDataDialog
        open={dialogName === "ScoreDataDialog"}
        instance={currentItem}
        close={closeDialog}
        disabled
      />:""}
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

export default UserQuestion;
