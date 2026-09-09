import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CustomerLoginForm } from "@/components/customer/CustomerLoginForm";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; notice?: string }>;
}) {
  const { redirect, notice } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="font-heading text-xl font-extrabold text-ink">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted">Login to your 5STAR.M account.</p>

          <div className="mt-6">
            <CustomerLoginForm redirectTo={redirect ?? "/customer/dashboard"} notice={notice} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">5STAR.M Estate &amp; Builders</p>
      </div>
    </main>
  );
}
