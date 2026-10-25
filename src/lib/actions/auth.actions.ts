"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ADMIN_2FA_COOKIE, ADMIN_2FA_VERIFY_PATH, isAdminTwoFactorEnabled } from "@/lib/adminTwoFactor";
import { issueLoginCode } from "@/lib/adminLoginCode";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase isn't connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase's own message is safe to show (e.g. "Invalid login
    // credentials") — it never leaks anything about the database itself.
    return { error: error.message || "Invalid email or password." };
  }

  const target = redirectTo.startsWith("/admin") ? redirectTo : "/admin/dashboard";

  // Second step: a code is emailed and must be entered on /admin/verify.
  // (Only when the switch is on - see src/lib/adminTwoFactor.ts.)
  if (isAdminTwoFactorEnabled()) {
    (await cookies()).delete(ADMIN_2FA_COOKIE);
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      const sent = await issueLoginCode(data.user.id, data.user.email);
      if (!sent.ok) {
        await supabase.auth.signOut();
        return { error: sent.error };
      }
    }
    redirect(`${ADMIN_2FA_VERIFY_PATH}?redirect=${encodeURIComponent(target)}`);
  }

  redirect(target);
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_2FA_COOKIE);
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("logoutAction: signOut failed:", e);
    }
  }
  redirect("/admin/login");
}
