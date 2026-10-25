"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { issueLoginCode } from "@/lib/adminLoginCode";
import {
  ADMIN_2FA_COOKIE,
  ADMIN_2FA_SESSION_SECONDS,
  createVerifiedCookieValue,
  hashLoginCode,
  isAdminTwoFactorEnabled,
  safeAdminRedirect,
} from "@/lib/adminTwoFactor";

const MAX_WRONG_TRIES = 5;

export interface TwoFactorState {
  error?: string;
  info?: string;
}

/** "Send a new code" button / first load of the verify page. */
export async function sendLoginCodeAction(): Promise<TwoFactorState> {
  if (!isSupabaseConfigured() || !isAdminTwoFactorEnabled()) return {};
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) redirect("/admin/login");
  const result = await issueLoginCode(user.id, user.email);
  return result.ok ? { info: `A new code was sent to ${result.sentTo}.` } : { error: result.error };
}

export async function verifyLoginCodeAction(
  _prev: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const redirectTo = safeAdminRedirect(String(formData.get("redirectTo") ?? ""));
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from the email." };

  if (!isSupabaseConfigured()) return { error: "Supabase isn't connected." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/admin/login");

  const db = createServiceRoleClient();
  const { data: row } = await db
    .from("admin_login_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", user.id)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { error: "This code has expired. Press \"Send a new code\"." };
  if (row.attempts >= MAX_WRONG_TRIES) {
    return { error: "Too many wrong tries. Press \"Send a new code\"." };
  }

  const expected = await hashLoginCode(user.id, code);
  if (!expected || expected !== row.code_hash) {
    await db.from("admin_login_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { error: "That code is not correct." };
  }

  await db.from("admin_login_codes").update({ used: true }).eq("id", row.id);

  const value = await createVerifiedCookieValue(user.id);
  if (!value) return { error: "The server is missing its secret key." };
  (await cookies()).set(ADMIN_2FA_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_2FA_SESSION_SECONDS,
  });
  redirect(redirectTo);
}
