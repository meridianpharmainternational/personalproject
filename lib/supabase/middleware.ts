import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyRoute, isAuthEntryPage, ROUTES } from "@/lib/routes";

/**
 * Runs on every matched request (see middleware.ts). Two jobs:
 *   1. Refresh the Supabase session (rewrites auth cookies).
 *   2. Send signed-out visitors of the /admin panel to /login; everything else
 *      is public.
 *
 * Route protection here is UX only. The /admin layout's requireAdmin() checks
 * admin membership server-side, and RLS in the database is the real boundary.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getClaims().
  // getClaims() refreshes an expired session (rewriting the cookies above) and
  // verifies the JWT locally against the project's signing keys, so it costs
  // no Auth round trip. Wrapped so a transient network/config error degrades
  // to "anonymous" instead of 500-ing public pages.
  let user: { id: string } | null = null;
  try {
    const sub = (await supabase.auth.getClaims()).data?.claims?.sub;
    user = typeof sub === "string" ? { id: sub } : null;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const kind = classifyRoute(pathname);

  // A logged-in admin on the login page is sent into the panel.
  if (user && isAuthEntryPage(pathname)) {
    return redirectTo(request, supabaseResponse, ROUTES.admin);
  }

  if (kind === "public") {
    return supabaseResponse;
  }

  // Admin routes require a signed-in user. Whether that user is an admin is
  // checked by requireAdmin() in the /admin layout (and by RLS on every admin
  // read), so the middleware no longer repeats that query on each request.
  if (!user) {
    return redirectTo(request, supabaseResponse, ROUTES.login, {
      redirectedFrom: pathname,
    });
  }

  return supabaseResponse;
}

/**
 * Build a redirect response while PRESERVING the refreshed auth cookies that
 * Supabase wrote onto `base` — skipping this cookie copy is the classic cause
 * of users being randomly logged out by middleware redirects.
 */
function redirectTo(
  request: NextRequest,
  base: NextResponse,
  pathname: string,
  query?: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const response = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
