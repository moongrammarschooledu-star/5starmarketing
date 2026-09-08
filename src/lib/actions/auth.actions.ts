"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await verifyAdminCredentials(email, password);
  if (!result.ok) {
    return { error: result.error };
  }

  const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE;
  const token = await createSessionToken(result.email, maxAge);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  redirect(redirectTo.startsWith("/admin") ? redirectTo : "/admin/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
