import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// NOTE: On Next.js 16+ this file is renamed to `proxy.ts` (same contents, the
// export becomes `proxy`). We pin Next.js 15 here, where `middleware.ts` is
// canonical. See the README "Upgrading to Next.js 16" note.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request EXCEPT static assets, so the session refreshes on
     * every navigable request:
     *   - _next/static, _next/image  (build output)
     *   - favicon.ico
     *   - common static file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)",
  ],
};
