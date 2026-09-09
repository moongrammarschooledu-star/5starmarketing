import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CustomerRegisterForm } from "@/components/customer/CustomerRegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: false },
};

export default function CustomerRegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <h1 className="font-heading text-xl font-extrabold text-ink">Create Your Account</h1>
          <p className="mt-1 text-sm text-muted">
            Save favorites, compare properties and track your inquiries.
          </p>

          <div className="mt-6">
            <CustomerRegisterForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">5STAR.M Estate &amp; Builders</p>
      </div>
    </main>
  );
}
