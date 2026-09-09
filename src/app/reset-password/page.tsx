import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "@/components/customer/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="font-heading text-xl font-extrabold text-ink">Set a New Password</h1>
          <p className="mt-1 text-sm text-muted">Choose a new password for your account.</p>

          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">5STAR.M Estate &amp; Builders</p>
      </div>
    </main>
  );
}
