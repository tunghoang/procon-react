import { useIntl } from "react-intl";
import { useFormik } from "formik";
import { useContext } from "react";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import * as Yup from "yup";
import { useNavigate, useSearch } from "@tanstack/react-router";
import Context from "../context";
import { apiSignIn } from "../api";

const Login = () => {
	const { formatMessage } = useIntl();
	const { updateLocalStorage } = useContext(Context);
	const navigate = useNavigate();
	const search = useSearch({ from: "/login" });

	const formik = useFormik({
		initialValues: {
			account: "",
			password: "",
		},
		validationSchema: Yup.object({
			account: Yup.string().max(255).required("Account is required"),
			password: Yup.string().max(255).required("Password is required"),
		}),
		onSubmit: async (data) => {
			const result = await apiSignIn(data);
			if (result instanceof Error) {
				return;
			}
			updateLocalStorage({
				token: result.token,
				locale: "vi-VN",
			});

			// Check if there's a redirect URL
			if (search?.redirect) {
				const redirectPath = decodeURIComponent(search.redirect);
				navigate({ to: redirectPath });
			} else if (result.team && result.team.is_admin) {
				navigate({ to: "/tournament" });
			} else {
				navigate({ to: "/competition" });
			}
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
			}}>
			<Container maxWidth="sm">
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
						autoComplete="on"
					/>
					<Box sx={{ py: 2 }}>
						<Button
							color="primary"
							disabled={formik.isSubmitting}
							fullWidth
							size="large"
							type="submit"
							variant="contained">
							{formatMessage({ id: "Sign In" })}
						</Button>
					</Box>
				</form>
			</Container>
		</Box>
	);
};

export default Login;
