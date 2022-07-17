import { usePath, navigate } from "hookrouter";
import { useIntl } from "react-intl";
import { useFormik } from "formik";
import { A } from "hookrouter";
import { useContext } from "react";
import * as Yup from "yup";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Context from "../context";

const Login = () => {
  const { formatMessage } = useIntl();
  const contextObj = useContext(Context);
  const formik = useFormik({
    initialValues: {
      account: "",
      password: "",
    },
    validationSchema: Yup.object({
      account: Yup.string().max(255).required("Account is required"),
      password: Yup.string().max(255).required("Password is required"),
    }),
    onSubmit: () => {
      contextObj.updateContext({ token: "abcdef" });
      navigate("/");
    },
  });

  return (
    <Box
      component="main"
      sx={{
        alignItems: "center",
        display: "flex",
        flexGrow: 1,
        minHeight: "100%",
      }}
    >
      <Container maxWidth="sm">
        {/* <A href="/">
          <Button
            component="span"
            startIcon={<ArrowBackIcon fontSize="small" />}
          >
            Home
          </Button>
        </A> */}
        <form onSubmit={formik.handleSubmit}>
          <Box sx={{ my: 3 }}>
            <Typography color="textPrimary" variant="h4">
              {formatMessage({ id: "Sign In" })}
            </Typography>
          </Box>
          <TextField
            error={Boolean(formik.touched.account && formik.errors.account)}
            fullWidth
            helperText={formik.touched.account && formik.errors.account}
            label={formatMessage({ id: "Account" })}
            margin="normal"
            name="account"
            type="account"
            onBlur={formik.handleBlur}
            onChange={formik.handleChange}
            value={formik.values.account}
            variant="outlined"
          />
          <TextField
            error={Boolean(formik.touched.password && formik.errors.password)}
            fullWidth
            helperText={formik.touched.password && formik.errors.password}
            label={formatMessage({ id: "Password" })}
            margin="normal"
            name="password"
            onBlur={formik.handleBlur}
            onChange={formik.handleChange}
            type="password"
            value={formik.values.password}
            variant="outlined"
          />
          <Box sx={{ py: 2 }}>
            <Button
              color="primary"
              disabled={formik.isSubmitting}
              fullWidth
              size="large"
              type="submit"
              variant="contained"
            >
              {formatMessage({ id: "Sign In" })}
            </Button>
          </Box>
          {/* <Typography color="textSecondary" variant="body2">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              variant="subtitle2"
              underline="hover"
              sx={{
                cursor: "pointer",
              }}
            >
              {formatMessage({ id: "Sign Up" })}
            </Link>
          </Typography> */}
        </form>
      </Container>
    </Box>
  );
};

export default Login;
