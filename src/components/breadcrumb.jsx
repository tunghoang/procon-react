import React, { useContext, useEffect, useState } from "react";
import { Breadcrumbs, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import Context from "../context";
import { api } from "../api/commons";

const SERVICE_API = import.meta.env.VITE_SERVICE_API;

export default function Breadcrumb() {
	const location = useLocation();
	const search = useSearch({ strict: false });
	const { tournament, round, userMatch, updateContext } = useContext(Context);
	const { formatMessage: tr } = useIntl();
	const [localTournament, setLocalTournament] = useState(null);
	const [localRound, setLocalRound] = useState(null);

	// Fetch tournament/round from query params if not in context
	useEffect(() => {
		const fetchData = async () => {
			const tournamentId = search?.tournament_id;
			const roundId = search?.round_id;

			if (tournamentId && !tournament) {
				try {
					const res = await api.get(
						`${SERVICE_API}/tournament/${tournamentId}`
					);
					setLocalTournament(res);
					updateContext?.({ tournament: res });
				} catch (e) {
					console.error("Failed to fetch tournament", e);
				}
			}

			if (roundId && !round) {
				try {
					const res = await api.get(`${SERVICE_API}/round/${roundId}`);
					setLocalRound(res);
					updateContext?.({ round: res });
				} catch (e) {
					console.error("Failed to fetch round", e);
				}
			}
		};

		fetchData();
	}, [search?.tournament_id, search?.round_id, tournament, round]);

	const displayTournament = tournament || localTournament;
	const displayRound = round || localRound;

	if (location.pathname.includes("/competition")) {
		return (
			<Breadcrumbs separator="›" aria-label="breadcrumb">
				<BreadcrumbItem
					title={`Competition ${userMatch ? `(${userMatch.name})` : ""}`}
					active={!userMatch}
					href="/competition"
				/>
				{userMatch && (
					<BreadcrumbItem title="Question" active={!!userMatch} href="#" />
				)}
			</Breadcrumbs>
		);
	}

	return (
		<Breadcrumbs separator="›" aria-label="breadcrumb">
			<BreadcrumbItem
				title={`${tr({ id: "Tournaments" })} ${
					displayTournament && !displayRound
						? `(${displayTournament.name})`
						: ""
				}`}
				active={!displayTournament && !displayRound}
				href="/"
			/>
			{displayTournament && (
				<BreadcrumbItem
					title={tr({ id: "Rounds" })}
					active={displayTournament && !displayRound}
					href="/rounds"
				/>
			)}
			{displayTournament && displayRound && (
				<Typography color="text.primary" fontWeight={"500"}>
					{`${displayTournament.name} & ${displayRound.name}`}
				</Typography>
			)}
		</Breadcrumbs>
	);
}

const BreadcrumbItem = ({ title, active, href }) => {
	return (
		<Link
			to={href}
			style={{
				color: "inherit",
				textDecoration: "none",
			}}>
			{active ? (
				<Typography color="text.primary" fontWeight={"500"}>
					{title}
				</Typography>
			) : (
				title
			)}
		</Link>
	);
};
