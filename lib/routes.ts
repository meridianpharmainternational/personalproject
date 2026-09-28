/**
 * Route classification for the middleware. Everything is public except the
 * admin panel, which requires a logged-in admin. There is no buyer/consumer
 * auth — the public catalog and enquiry form need no account.
 */

export type RouteKind = "public" | "admin";

export const ROUTES = {
  home: "/",
  login: "/login",
  admin: "/admin",
  medicines: "/medicines",
  contact: "/contact",
} as const;

const ADMIN_PREFIXES = ["/admin"] as const;

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function classifyRoute(pathname: string): RouteKind {
  if (ADMIN_PREFIXES.some((p) => isUnder(pathname, p))) return "admin";
  return "public";
}

/** The admin login page — a logged-in admin visiting it is bounced to /admin. */
export function isAuthEntryPage(pathname: string): boolean {
  return pathname === ROUTES.login;
}
