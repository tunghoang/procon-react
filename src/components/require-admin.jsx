import { useContext, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import Context from "../context";
import { isStaff } from "../utils/roles";

// Admin area: a superadmin or a group manager. What each may do inside is
// decided per page (utils/roles.js) and enforced by the backend.
export const RequireAdmin = ({ children }) => {
	const { team } = useContext(Context);
	const navigate = useNavigate();

	useEffect(() => {
		if (team && !isStaff(team)) {
			navigate({ to: "/forbidden", replace: true });
		}
	}, [team, navigate]);

	if (!team || !isStaff(team)) {
		return null;
	}

	return <>{children}</>;
};
