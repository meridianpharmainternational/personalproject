import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/auth/access";
import { ROUTES } from "@/lib/routes";

/**
 * Server-side admin guard for the /admin layout and admin Server Actions.
 * Defense-in-depth on top of the middleware; RLS in the DB is the final layer.
 *
 * - `getClaims()` verifies the session JWT locally against the project's
 *   published signing keys (ES256), so it costs no Auth round trip; only the
 *   `admins` lookup goes to the database.
 * - `cache()` runs the check once per request, however many callers ask
 *   (layout, page, data helpers).
 * - `redirect()` throws internally, so it is always called OUTSIDE any try/catch.
 */
export const requireAdmin = cache(async (): Promise<{ userId: string; email: string | null }> => {
  const supabase = await createClient();

  let userId: string | null = null;
  let email: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (typeof claims?.sub === "string") {
      userId = claims.sub;
      email = typeof claims.email === "string" ? claims.email : null;
    }
  } catch {
    userId = null;
  }
  if (!userId) redirect(ROUTES.login);

  let ok = false;
  try {
    ok = await checkIsAdmin(supabase, userId);
  } catch {
    ok = false;
  }
  if (!ok) redirect(ROUTES.home);

  return { userId, email };
});
