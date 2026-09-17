/**
 * Roles, read off the decoded JWT (`team` in Context). Mirrors the
 * team-manager's lib/scope.js:
 *
 *   superadmin  is_admin === true                          -- everything
 *   manager     group_role === "manager" with a group_id   -- its own group:
 *               the members, the group's matches/questions, and the engine
 *               games behind them. No account creation, no board generator.
 *   team        anyone else                                -- plays
 *
 * `isStaff` is the admin-area gate (superadmin or manager); `isSuperAdmin`
 * guards what stays organiser-only (tournaments/rounds/groups/accounts,
 * Generate board).
 */
export const isSuperAdmin = (team) => !!team?.is_admin;

export const isManager = (team) =>
	!isSuperAdmin(team) && team?.group_role === "manager" && team?.group_id != null;

export const isStaff = (team) => isSuperAdmin(team) || isManager(team);

/** The manager's own group id (a number), or null for anyone else. */
export const managerGroupId = (team) => (isManager(team) ? Number(team.group_id) : null);
