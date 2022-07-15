import { usePath, navigate } from 'hookrouter';
import { useIntl } from 'react-intl';
import { useFormik } from 'formik';
import { A } from 'hookrouter';
import { useContext } from 'react';
import * as Yup from 'yup';
import { Box, Button, Container, Link, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Context from '../context';

const Login = () => {
  const {formatMessage} = useIntl();
  const contextObj = useContext(Context);
  const formik = useFormik({
    initialValues: {
      email: 'demo@devias.io',
      password: 'Password123'
    },
    validationSchema: Yup.object({
      email: Yup
        .string()
        .email(
          'Must be a valid email')
        .max(255)
        .required(
          'Email is required'),
      password: Yup
        .string()
        .max(255)
        .required(
          'Password is required')
    }),
    onSubmit: () => {
      contextObj.updateContext({ token: 'abcdef' });
      navigate('/');
    }
  });

  const path = usePath();
  if (!contextObj.token) {
    if (path !== '/login') {
      setTimeout(() => navigate('/login'), 300);
    }
  }
  else {
    if (path === '/login') {
      setTimeout(() => navigate('/'), 300);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexGrow: 1,
        minHeight: '100%'
      }}
    >
      <Container maxWidth="sm">
        <A href="/" >
          <Button component="span" startIcon={<ArrowBackIcon fontSize="small" />} >
            Home
          </Button>
        </A>
        <form onSubmit={formik.handleSubmit} >
          <Box sx={{ my: 3 }}>
            <Typography color="textPrimary" variant="h4" >{formatMessage({ id: "Sign In"})}</Typography>
          </Box>
          <TextField
            error={Boolean(formik.touched.email && formik.errors.email)}
            fullWidth
            helperText={formik.touched.email && formik.errors.email}
            label={formatMessage({id: "Email Address"})}
            margin="normal"
            name="email"
            onBlur={formik.handleBlur}
            onChange={formik.handleChange}
            type="email"
            value={formik.values.email}
            variant="outlined"
          />
          <TextField
            error={Boolean(formik.touched.password && formik.errors.password)}
            fullWidth
            helperText={formik.touched.password && formik.errors.password}
            label={formatMessage({ id: "Password"})}
            margin="normal"
            name="password"
            onBlur={formik.handleBlur}
            onChange={formik.handleChange}
            type="password"
            value={formik.values.password}
            variant="outlined"
          />
          <Box sx={{ py: 2 }}>
            <Button color="primary" disabled={formik.isSubmitting} fullWidth size="large" type="submit" variant="contained" >
              {formatMessage({id: "Sign In"})}
            </Button>
          </Box>
          <Typography color="textSecondary" variant="body2">
              Don&apos;t have an account? {' '}
              <Link to="/register" variant="subtitle2" underline="hover" sx={{
                  cursor: 'pointer'
                }}
              >{formatMessage({id: "Sign Up"})}</Link>
          </Typography>
        </form>
      </Container>
    </Box>
  );
};

export default Login;
