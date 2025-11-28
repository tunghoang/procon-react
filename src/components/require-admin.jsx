import { useContext, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import Context from "../context";

export const RequireAdmin = ({ children }) => {
	const { team } = useContext(Context);
	const navigate = useNavigate();

	useEffect(() => {
		if (team && !team.is_admin) {
			navigate({ to: "/forbidden", replace: true });
		}
	}, [team, navigate]);

	if (!team || !team.is_admin) {
		return null;
	}

	return <>{children}</>;
};
