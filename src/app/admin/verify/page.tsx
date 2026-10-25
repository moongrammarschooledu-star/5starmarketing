import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { VerifyForm } from "@/components/admin/VerifyForm";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isAdminTwoFactorEnabled, safeAdminRedirect } from "@/lib/adminTwoFactor";

export const metadata: Metadata = {
  title: "Verify Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const target = safeAdminRedirect(redirectParam);

  if (!isAdminTwoFactorEnabled() || !isSupabaseConfigured()) redirect(target);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");

  // If a code was already sent (right after the password step) do not send
  // another one when this page opens.
  const { data: pending } = await createServiceRoleClient()
    .from("admin_login_codes")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="font-heading text-xl font-extrabold text-ink">Check your email</h1>
          <p className="mt-1 text-sm text-muted">
            We sent a 6-digit code to your login email. Enter it to finish signing in.
          </p>
          <div className="mt-6">
            <VerifyForm redirectTo={target} needsSend={!pending} />
          </div>
        </div>
      </div>
    </main>
  );
}
