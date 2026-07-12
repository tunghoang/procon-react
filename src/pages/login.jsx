import { useIntl } from "react-intl";
import { useFormik } from "formik";
import { useContext, useState } from "react";
import {
	Box,
	Button,
	Container,
	IconButton,
	InputAdornment,
	TextField,
	Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import * as Yup from "yup";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { jwtDecode } from "jwt-decode";
import Context from "../context";
import { apiSignIn } from "../api";

const Login = () => {
	const { formatMessage } = useIntl();
	const { updateLocalStorage } = useContext(Context);
	const navigate = useNavigate();
	const search = useSearch({ from: "/login" });
	const [showPassword, setShowPassword] = useState(false);

	const formik = useFormik({
		initialValues: {
			account: "",
			password: "",
		},
		validationSchema: Yup.object({
			account: Yup.string()
				.max(255)
				.required(formatMessage({ id: "login.accountRequired" })),
			password: Yup.string()
				.max(255)
				.required(formatMessage({ id: "login.passwordRequired" })),
		}),
		onSubmit: async (data) => {
			const result = await apiSignIn(data);
			if (result instanceof Error) {
				return;
			}
			// Keep the user's stored locale; only the token changes on login.
			updateLocalStorage({ token: result.token });

			// The signin body is {id, token} for the admin backdoor and
			// {id, is_admin, token} for teams — the JWT payload always carries
			// is_admin, so decode it for the redirect decision.
			let isAdmin = !!result.is_admin;
			try {
				isAdmin = !!jwtDecode(result.token)?.is_admin;
			} catch {
				// fall back to the response field
			}

			// Check if there's a redirect URL
			if (search?.redirect) {
				const redirectPath = decodeURIComponent(search.redirect);
				navigate({ to: redirectPath });
			} else if (isAdmin) {
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
						type="text"
						autoComplete="username"
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
						type={showPassword ? "text" : "password"}
						value={formik.values.password}
						variant="outlined"
						autoComplete="current-password"
						InputProps={{
							endAdornment: (
								<InputAdornment position="end">
									<IconButton
										aria-label={formatMessage({ id: "login.togglePassword" })}
										onClick={() => setShowPassword((show) => !show)}
										edge="end">
										{showPassword ? <VisibilityOff /> : <Visibility />}
									</IconButton>
								</InputAdornment>
							),
						}}
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
