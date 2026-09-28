import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyRoute, isAuthEntryPage, ROUTES } from "@/lib/routes";
import { checkIsAdmin } from "@/lib/auth/access";

/**
 * Runs on every matched request (see middleware.ts). Two jobs:
 *   1. Refresh the Supabase session (rewrites auth cookies).
 *   2. Gate the /admin panel to logged-in admins; everything else is public.
 *
 * Route protection here is UX + defense-in-depth; RLS is the real boundary and
 * the /admin layout re-checks server-side as a third layer.
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

  // IMPORTANT: do not run code between createServerClient and getUser().
  // Wrapped so a transient network/config error degrades to "anonymous"
  // instead of 500-ing public pages.
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
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

  // Admin routes require a logged-in admin.
  if (!user) {
    return redirectTo(request, supabaseResponse, ROUTES.login, {
      redirectedFrom: pathname,
    });
  }
  const isAdmin = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    return redirectTo(request, supabaseResponse, ROUTES.home);
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
