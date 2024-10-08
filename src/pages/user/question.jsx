import "./question.css";
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
import { UserAnswerDialog, ScoreDataDialog } from "../../dialogs/answer";
import { formatDateTime } from "../../utils/commons";
import CardData from "../../components/card-data";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import Context from "../../context";
import LoadingPage from "../../components/loading-page";

const UserQuestion = () => {
  const { userMatch } = useContext(Context);
  const [dialogName, setDialogName] = useState("");
  const [currentItem, setCurrentItem] = useState(null);
  const [payload, setPayload] = useState(null);
  const { formatMessage: tr } = useIntl();
  const { data: questions, loading: qloading } = useFetchData({
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
    loading: aloading,
  } = useFetchData({
    path: "/answer",
    name: "Answer",
    config: {
      params: {
        "match[eq_id]": userMatch?.id,
      },
    },
  });
  const { apiCreate } = useApi("/answer", "Answer");

  const closeDialog = () => {
    setDialogName("");
  };

  const saveInstance = async () => {
    const result = await apiCreate(payload);
    if (result) await refetch();
    setDialogName("");
  };
  const changeInstance = (changes) => {
    setPayload({ ...payload, ...changes });
  };

  if (qloading || aloading) return <LoadingPage />;

  const renderQuestions = () => {

    if (!questions.length) return (
      <Typography
        variant="h4"
        m="auto"
        sx={{
          opacity: 0.3,
          verticalAlign: "middle",
          lineHeight: "300px",
        }}
      >
        No questions added yet
      </Typography>
    )

    return questions.map((question) => {
      const uAnswers = answers.filter(
        (item) => item.question_id === question.id
      );
      const questionData = JSON.parse(
        question.question_data || "{}"
      );
      return (
        <Grid item key={question.id} lg={4} md={6} xs={12}>
          <CardData
            name={question.name}
            description={
              <Stack alignItems={"flex-start"}>
                <div
                  style={{
                    textAlign: "left",
                    marginBottom: "12px",
                  }}
                >
                  <div className="data-item">
                    <span>ID:</span> {question.id}
                  </div>
                  <div className="data-item">
                    <span>Width:</span> {questionData.board?.width}
                  </div>
                  <div className="data-item">
                    <span>Height:</span>{" "}
                    {questionData.board?.height}
                  </div>
                  <div className="data-item">
                    <span>General patterns:</span>{" "}
                    {questionData.general?.n}
                  </div>
                </div>
                {/* <div>
                    Start Time: {formatDateTime(question.start_time)}
                  </div>
                  <div>
                    End Time: {formatDateTime(question.end_time)}
                  </div> */}
              </Stack>
            }
            handleSelect={() => {
              setDialogName("UserAnswerDialog");
              setCurrentItem({
                answers: uAnswers,
                question,
              });
              setPayload({
                question_id: question.id,
              });
            }}
            showAction={!!uAnswers.length}
            action={
              uAnswers.length && (
                <Button
                  onClick={() => {
                    setDialogName("ScoreDataDialog");
                    setCurrentItem({
                      answers: uAnswers,
                      question,
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
                    {tr({ id: "Score" })}
                  </Typography>
                </Button>
              )
            }
          />
        </Grid>
      );
    })
  }

  return (
    <>
      <DashboardLayoutRoot
        style={{ paddingLeft: "0px", marginTop: "20px" }}
        className="UserQuestion"
      >
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
            <Toolbar />
            <Grid container spacing={3}>
              {renderQuestions()}
            </Grid>
          </Container>
        </Box>
      </DashboardLayoutRoot>
      {dialogName === "UserAnswerDialog" && (
        <UserAnswerDialog
          open={dialogName === "UserAnswerDialog"}
          instance={currentItem}
          close={closeDialog}
          save={saveInstance}
          handleChange={changeInstance}
        />
      )}
      {dialogName === "ScoreDataDialog" && (
        <ScoreDataDialog
          open={dialogName === "ScoreDataDialog"}
          instance={currentItem}
          close={closeDialog}
          disabled
        />
      )}
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
