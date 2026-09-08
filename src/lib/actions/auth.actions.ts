"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

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

  redirect(redirectTo.startsWith("/admin") ? redirectTo : "/admin/dashboard");
}

export async function logoutAction() {
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
