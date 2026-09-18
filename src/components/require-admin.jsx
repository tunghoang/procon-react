import { useContext, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import Context from "../context";
import { isStaff } from "../utils/roles";
import { currentRedirect } from "../utils/redirect";
import LoadingPage from "./loading-page";

// Admin area: a superadmin or a group manager. What each may do inside is
// decided per page (utils/roles.js) and enforced by the backend.
export const RequireAdmin = ({ children }) => {
	const { team, token } = useContext(Context);
	const navigate = useNavigate();

	useEffect(() => {
		// No session at all (never signed in, signed out, or the token expired
		// and was cleared by the 401 interceptor): go to the sign-in form and
		// remember where the user was heading. Rendering null here was the
		// "/admin/* is a blank page" bug -- nothing on screen, no way back.
		if (!token) {
			navigate({
				to: "/login",
				search: { redirect: currentRedirect() },
				replace: true,
			});
			return;
		}
		if (team && !isStaff(team)) {
			navigate({ to: "/forbidden", replace: true });
		}
	}, [team, token, navigate]);

	// A token whose team has not been decoded yet is a normal first paint
	// (App decodes it in an effect) -- show the spinner, not a blank page.
	if (token && !team) return <LoadingPage />;
	if (!token || !isStaff(team)) return <LoadingPage />;

	return <>{children}</>;
};
