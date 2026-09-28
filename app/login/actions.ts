"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { ROUTES } from "@/lib/routes";

export type LoginResult = { error: string | null };

/**
 * Admin login. Called from the client login form. On success it redirects to
 * the admin panel (middleware sends non-admins back home). On failure it
 * returns an error message to display.
 */
export async function login(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }

  redirect(ROUTES.admin);
}
