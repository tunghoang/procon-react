import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useIntl } from "react-intl";

const CardData = ({
  data,
  handleDelete,
  handleEdit,
  handleSelect,
  ...rest
}) => {
  const [zDepth, setZDepth] = useState(false);
  const [color, setColor] = useState("#FFFFFF");
  const { formatMessage: tr } = useIntl();
  return (
    <>
      <Card
        raised={zDepth}
        onMouseOver={() => {
          setZDepth(true);
          setColor("#f5f4e3");
        }}
        onMouseOut={() => {
          setZDepth(false);
          setColor("#FFFFFF");
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: color,
        }}
        {...rest}
      >
        <CardContent sx={{ cursor: "pointer" }} onClick={handleSelect}>
          <Typography
            align="center"
            color="textPrimary"
            gutterBottom
            variant="h5"
          >
            {data.name}
          </Typography>
          <Typography align="center" color="textPrimary" variant="body1">
            {data.description}
          </Typography>
        </CardContent>
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ justifyContent: "space-between" }}>
            <Grid item sx={{ alignItems: "center", display: "flex" }}>
              <Button onClick={handleEdit}>
                <EditIcon color="action" />
                <Typography
                  color="textSecondary"
                  display="inline"
                  sx={{ pl: 1 }}
                  variant="body2"
                >
                  {tr({ id: "Edit" })}
                </Typography>
              </Button>
            </Grid>
            <Grid item sx={{ alignItems: "center", display: "flex" }}>
              <Button onClick={handleDelete}>
                <DeleteIcon color="action" />
                <Typography
                  color="textSecondary"
                  display="inline"
                  sx={{ pl: 1 }}
                  variant="body2"
                >
                  {tr({ id: "Remove" })}
                </Typography>
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Card>
    </>
  );
};

export default CardData;
