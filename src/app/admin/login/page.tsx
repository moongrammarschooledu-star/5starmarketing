import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="font-heading text-xl font-extrabold text-ink">Admin Login</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage the 5STAR.M website.</p>

          <div className="mt-6">
            <LoginForm redirectTo={redirect ?? "/admin/dashboard"} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          5STAR.M Estate &amp; Builders — Admin Dashboard
        </p>
      </div>
    </main>
  );
}
