import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/auth/access";
import { ROUTES } from "@/lib/routes";

/**
 * Server-side admin guard for the /admin layout and admin Server Actions.
 * Defense-in-depth on top of the middleware; RLS in the DB is the final layer.
 *
 * `redirect()` throws internally, so it is always called OUTSIDE any try/catch.
 */
export async function requireAdmin(): Promise<{
  userId: string;
  email: string | null;
}> {
  const supabase = await createClient();

  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }
  if (!user) redirect(ROUTES.login);

  let ok = false;
  try {
    ok = await checkIsAdmin(supabase, user.id);
  } catch {
    ok = false;
  }
  if (!ok) redirect(ROUTES.home);

  return { userId: user.id, email: user.email ?? null };
}
