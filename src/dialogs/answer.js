import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Stack,
  Autocomplete,
  Typography,
  Box,
  Grid,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useContext, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { api, doGet, doPost } from "../api/commons";
import { useFetchData } from "../api/useFetchData";
import CodeEditor from "../components/code-editor";
import Context from "../context";

const SERVICE_API = process.env.REACT_APP_SERVICE_API;

const useStyles = makeStyles({
  root: {
    // overflow: "visible",
  },
});
const AnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const { round } = useContext(Context);
  const { data: questions } = useFetchData({
    path: "/question",
    name: "Question",
  });
  const { data: teams } = useFetchData({ path: "/team", name: "Team" });
  const answerData = instance?.answer_data || [];

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit Answer" : "Create Answer"}
      </DialogTitle>
      <DialogContent className={classes.root}>
        <Stack spacing={3} width={500}>
          <Autocomplete
            options={questions.filter(
              (item) => item.match.round_id === round?.id
            )}
            value={
              questions.find((item) => item.id === instance?.question_id) ||
              null
            }
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <Box {...props}>
                <Typography>{option.name}</Typography>
                <Typography fontSize={"0.9rem"} ml={2} sx={{ opacity: 0.5 }}>
                  {`card number: ${
                    JSON.parse(option.question_data || "{}").n_cards
                  }`}
                </Typography>
              </Box>
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Question"} variant="standard" />
            )}
            onChange={(evt, v) => {
              handleChange({ question_id: v?.id });
            }}
          />
          <Autocomplete
            options={teams}
            value={teams.find((item) => item.id === instance.team_id) || null}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label={"Team"} variant="standard" />
            )}
            onChange={(evt, v) => handleChange({ team_id: v?.id })}
          />
          <CodeEditor
            title="Answer Data"
            defaultValue={answerData}
            onValueChange={(value) => handleChange({ answer_data: value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button onClick={save}>{tr({ id: "Save" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

const UserAnswerDialog = ({ open, instance, close, save, handleChange }) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  const [isDisabled, setIsDisabled] = useState(true);
  const answerData = instance?.answer_data || {};
  // const [segments, setSegments] = useState([]);

  // const formatReadingCards = () => {
  //   const arr = [];
  //   for (let i = 0; i < 88; i++) {
  //     let card = i + 1;
  //     if (card <= 44) {
  //       card = "E" + (card < 10 ? `0${card}` : card);
  //     } else {
  //       card -= 44;
  //       card = "J" + (card < 10 ? `0${card}` : card);
  //     }
  //     arr.push(card);
  //   }

  //   return arr;
  // };
  // function getRequestedSegments() {
  //   if (!open) return;
  //   if (!instance?.question_id) return;

  //   doPost(
  //     `${SERVICE_API}/question/${instance.question_id}/divided-data`,
  //     {},
  //     { new: false }
  //   )
  //     .then(({ data: segmentUUIDs }) => {
  //       console.log(segmentUUIDs);
  //       setSegments(segmentUUIDs);
  //     })
  //     .catch((e) => {
  //       console.error(e);
  //     });
  // }
  // const requestNewSegment = async () => {
  //   console.log(instance, open);
  //   if (!open) return;
  //   if (!instance?.question_id) return;

  //   doPost(
  //     `${SERVICE_API}/question/${instance.question_id}/divided-data`,
  //     {},
  //     { new: true }
  //   )
  //     .then(({ data: segmentUUIDs }) => {
  //       console.log(segmentUUIDs);
  //       setSegments(segmentUUIDs);
  //     })
  //     .catch((e) => {
  //       console.error(e);
  //     });
  // };
  // const readingCards = useMemo(() => formatReadingCards(), []);
  if (!instance) return null;

  const questionData = JSON.parse(instance.question.question_data);

  // useEffect(() => getRequestedSegments(), [instance.question_id]);

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>
        {instance?.id ? "Edit answer" : "Create answer"}
      </DialogTitle>
      <DialogContent className={classes.root}>
        <Stack spacing={3} width={500}>
          <Stack spacing={1}>
            <Typography variant="h6">Problem Data</Typography>
            {questionData.board.goal.map((row, ridx) => {
              return (
                <div key={ridx}>
                  {row.map((item, cidx) => {
                    if (item === 0)
                      return (
                        <span style={{ backgroundColor: "red" }} key={cidx}>
                          {item}
                        </span>
                      );
                    if (item === 1)
                      return (
                        <span style={{ backgroundColor: "green" }} key={cidx}>
                          {item}
                        </span>
                      );
                    if (item === 2)
                      return (
                        <span style={{ backgroundColor: "blue" }} key={cidx}>
                          {item}
                        </span>
                      );
                    else
                      return (
                        <span style={{ backgroundColor: "yellow" }} key={cidx}>
                          {item}
                        </span>
                      );
                  })}
                </div>
              );
            })}
            {/* <AudioAuth
              src={`${SERVICE_API}/question/${instance.question_id}/audio/problem-data`}
              type="audio/wav"
              controls
            /> */}
          </Stack>
          {/* <Stack spacing={1}>
            <Typography variant="h6">Divided Data 
              <Button onClick={getRequestedSegments}>Refresh</Button>
              <Button onClick={requestNewSegment}>Retrieve</Button>
            </Typography>
            <Grid container spacing={1}>
              {segments.map((s, idx) => (
                <div key={s} style={{display:"inline-block", width: '49%', marginRight: '5px'}}>
                  <AudioAuth src={`${SERVICE_API}/question/${instance.question_id}/audio/divided-data?uuid=${s}`}
                      type="audio/wav"
                      controls
                  />
                </div>
              ))}
            </Grid>
          </Stack> */}
          {/* <Stack spacing={1}>
            <Typography variant="h6">Reading Cards</Typography>
            <Grid
              container
              sx={{ height: "180px", overflowY: "scroll" }}
              spacing={1}
            >
              {readingCards.map((card, idx) => {
                return (
                  <Grid item key={idx} xs={2}>
                    <AudioController
                      src={`${SERVICE_API}/question/download/resource/${card}.wav`}
                      label={card}
                      type="audio/wav"
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Stack> */}
          <CodeEditor
            title="Answer Data"
            height="180px"
            // subTitle={'Example: ["E01", "E02", "E03"]'}
            defaultValue={answerData}
            onValueChange={(value) => {
              handleChange({ answer_data: value });
              setIsDisabled(false);
            }}
            onError={() => setIsDisabled(true)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Cancel" })}</Button>
        <Button onClick={save} disabled={isDisabled}>
          {tr({ id: "Save" })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ScoreDataDialog = ({
  open,
  instance,
  close,
  title = "Score Data",
  disabled = false,
}) => {
  const classes = useStyles();
  const { formatMessage: tr } = useIntl();
  if (!instance) return null;

  const _getScoreData = () => {
    if (!instance.score_data) {
      return instance.score_data;
    }
    const scoreData = JSON.parse(instance.score_data);
    const question = instance.question;
    const startTime = new Date(question.start_time);
    const submitTime = new Date(instance.updatedAt);
    const duration = submitTime - startTime;
    scoreData.duration = duration;
    scoreData.start_time = startTime;
    scoreData.submit_time = submitTime;

    return JSON.stringify(scoreData);
  };

  return (
    <Dialog
      classes={{ paperScrollPaper: classes.root }}
      open={open}
      onClose={close}
    >
      <DialogTitle>{instance.team?.name}</DialogTitle>
      <DialogContent className={classes.root} style={{ minWidth: 500 }}>
        <CodeEditor
          title={title}
          defaultValue={_getScoreData()}
          readOnly={disabled}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{tr({ id: "Close" })}</Button>
      </DialogActions>
    </Dialog>
  );
};

export { AnswerDialog, ScoreDataDialog, UserAnswerDialog };
