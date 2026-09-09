"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export interface AuthFormState {
  error?: string;
  info?: string;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export async function registerAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName || !email || !phone || !password) {
    return { error: "Please fill in all fields." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!PHONE_PATTERN.test(phone)) {
    return { error: "Please enter a valid phone number." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Supabase isn't connected yet. Please try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { account_type: "customer", full_name: fullName, phone },
    },
  });

  if (error) {
    return { error: error.message || "Could not create your account." };
  }

  // A confirmed Supabase project without "Confirm email" enabled returns
  // a session immediately; one with email confirmation on returns a user
  // but no session until they click the confirmation link.
  if (data.session) {
    redirect("/customer/dashboard");
  }
  return { info: "Account created! Please check your email to confirm your address, then log in." };
}

export async function customerLoginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/customer/dashboard");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Supabase isn't connected yet. Please try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message || "Invalid email or password." };
  }

  // This form is for customers only — an admin account has no
  // customer_profiles row, so reject it here rather than showing a
  // broken/empty customer dashboard.
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id, disabled")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This is an admin account. Please use the admin login instead." };
  }
  if (profile.disabled) {
    await supabase.auth.signOut();
    return { error: "This account has been disabled. Please contact 5STAR.M for help." };
  }

  redirect(redirectTo.startsWith("/customer") ? redirectTo : "/customer/dashboard");
}

export async function forgotPasswordAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Supabase isn't connected yet. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site.url}/reset-password`,
  });
  // Never reveal whether the email exists — always show the same message.
  if (error) console.error("forgotPasswordAction failed:", error);
  return { info: "If an account exists for that email, a password reset link has been sent." };
}

export async function customerLogoutAction() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("customerLogoutAction: signOut failed:", e);
    }
  }
  redirect("/login");
}
