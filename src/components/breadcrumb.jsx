import React, { useContext } from "react";
import { Breadcrumbs, Typography } from "@mui/material";
import { A, usePath } from "hookrouter";
import { useIntl } from "react-intl";
import Context from "../context";

export default function Breadcrumb() {
  // const path = usePath();
  const { tournament, round, userMatch } = useContext(Context);
  const { formatMessage: tr } = useIntl();

  // if (path.includes("/competition")) {
  if (window.location.pathname.includes("/competition")) {
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
          tournament && !round ? `(${tournament.name})` : ""
        }`}
        active={!tournament && !round}
        href="/"
      />
      {tournament && (
        <BreadcrumbItem
          title={tr({ id: "Rounds" })}
          active={tournament && !round}
          href="/rounds"
        />
      )}
      {tournament && round && (
        <Typography color="text.primary" fontWeight={"500"}>
          {`${tournament.name} & ${round.name}`}
        </Typography>
      )}
    </Breadcrumbs>
  );
}

const BreadcrumbItem = ({ title, active, href }) => {
  return (
    <A
      style={{
        color: "inherit",
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      }}
      href={href}
    >
      {active ? (
        <Typography color="text.primary" fontWeight={"500"}>
          {title}
        </Typography>
      ) : (
        title
      )}
    </A>
  );
};
