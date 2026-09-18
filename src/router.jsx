import {
	createRouter,
	createRootRoute,
	createRoute,
	redirect,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import Tournaments from "./pages/tournaments";
import Matches from "./pages/matches";
import Teams from "./pages/teams";
import Groups from "./pages/groups";
import Rounds from "./pages/rounds";
import Questions from "./pages/questions";
import Answers from "./pages/answers";
import ScoreSummary from "./pages/score-summary";
import RoundStandings from "./pages/round-standings";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import Forbidden from "./pages/forbidden";
import Competition from "./pages/user/competition";
import UserQuestion from "./pages/user/question";
import UserGame from "./pages/user/game";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { DashboardLayout } from "./components/dashboard-layout";
import { RequireAdmin } from "./components/require-admin";
import ErrorBoundary from "./components/error-boundary";

// Root route
const rootRoute = createRootRoute({
	component: () => (
		<>
			<Outlet />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</>
	),
	notFoundComponent: NotFound,
});

/** The admin pages, each mounted behind its own error boundary instance. */
const AdminOutlet = () => {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	return (
		<ErrorBoundary key={pathname}>
			<Outlet />
		</ErrorBoundary>
	);
};

// Admin layout route
const adminLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "admin-layout",
	// The boundary sits INSIDE the layout so a page-level render error keeps
	// the sidebar and navbar (i.e. a way out) instead of blanking the console
	// mid-match, which is what a throw in questions.jsx/matches.jsx used to do.
	// `key` resets it on navigation: without that, one broken page would keep
	// showing the fallback after the admin moved to a working one.
	component: () => (
		<RequireAdmin>
			<DashboardLayout>
				<AdminOutlet />
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

// HEXUDON (procon26) play screen; gameId = question id on the game service.
const competitionGameRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/competition/game/$gameId",
	component: UserGame,
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

// Groups (schools) and their managers -- superadmin only (the page itself
// bounces anyone else; the endpoints are requireAdmin).
const adminGroupsRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/groups",
	component: Groups,
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

// HEXUDON round standings (admin only -- the endpoints behind it sit under
// requireAdmin in the team-manager).
const adminRoundStandingsRoute = createRoute({
	getParentRoute: () => adminLayoutRoute,
	path: "/admin/round-standings",
	component: RoundStandings,
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
	competitionGameRoute,
	adminLayoutRoute.addChildren([
		adminTeamsRoute,
		adminGroupsRoute,
		adminMatchesRoute,
		adminQuestionsRoute,
		adminAnswersRoute,
		adminScoreSummaryRoute,
		adminRoundStandingsRoute,
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
