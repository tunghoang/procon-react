import {
	createRouter,
	createRootRoute,
	createRoute,
	redirect,
	Outlet,
} from "@tanstack/react-router";
import Tournaments from "./pages/tournaments";
import Matches from "./pages/matches";
import Teams from "./pages/teams";
import Rounds from "./pages/rounds";
import Questions from "./pages/questions";
import Answers from "./pages/answers";
import ScoreSummary from "./pages/score-summary";
import Reset from "./pages/reset";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import Forbidden from "./pages/forbidden";
import Competition from "./pages/user/competition";
import UserQuestion from "./pages/user/question";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { DashboardLayout } from "./components/dashboard-layout";
import { RequireAdmin } from "./components/require-admin";

// Root route
const rootRoute = createRootRoute({
	component: () => (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
	notFoundComponent: NotFound,
});

// Admin layout route
const adminLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "admin-layout",
	component: () => (
		<RequireAdmin>
			<DashboardLayout>
				<Outlet />
			</DashboardLayout>
		</RequireAdmin>
	),
});

// Login route
const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: Login,
});

// Tournament routes
const tournamentIndexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament",
	component: Tournaments,
});

const tournamentDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId",
	component: Tournaments,
});

const tournamentRoundsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId/rounds",
	component: Rounds,
});

const tournamentRoundDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId/round/$roundId",
	component: Rounds,
});

const tournamentRoundMatchesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId/round/$roundId/matches",
	component: Matches,
});

const tournamentRoundMatchDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId/round/$roundId/match/$matchId",
	component: Matches,
});

const tournamentRoundMatchQuestionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tournament/$tournamentId/round/$roundId/match/$matchId/questions",
	component: UserQuestion,
});

// Competition routes
const competitionIndexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/competition",
	component: Competition,
});

const competitionDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/competition/tournament/$tournamentId/round/$roundId",
	component: Competition,
});

// Admin routes
const adminTeamsRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/teams",
	component: Teams,
});

const adminMatchesRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/matches",
	component: Matches,
});

const adminQuestionsRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/questions",
	component: Questions,
});

const adminAnswersRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/answers",
	component: Answers,
});

const adminScoreSummaryRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/score-summary",
	component: ScoreSummary,
});

const adminResetRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/reset",
	component: Reset,
});

// Special routes
const forbiddenRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/forbidden",
	component: Forbidden,
});

const notFoundRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "*",
	component: NotFound,
});

// Root index route - redirect based on auth
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: () => {
		const token = localStorage.getItem("token");
		if (!token) {
			throw redirect({ to: "/login" });
		}
		throw redirect({ to: "/competition" });
	},
});

// Create the route tree
const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	tournamentIndexRoute,
	tournamentDetailRoute,
	tournamentRoundsRoute,
	tournamentRoundDetailRoute,
	tournamentRoundMatchesRoute,
	tournamentRoundMatchDetailRoute,
	tournamentRoundMatchQuestionsRoute,
	competitionIndexRoute,
	competitionDetailRoute,
	adminLayoutRoute.addChildren([
		adminTeamsRoute,
		adminMatchesRoute,
		adminQuestionsRoute,
		adminAnswersRoute,
		adminScoreSummaryRoute,
		adminResetRoute,
	]),
	forbiddenRoute,
	notFoundRoute,
]);

// Create and export the router
export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultNotFoundComponent: NotFound,
	context: {
		token: null,
		team: null,
	},
});
