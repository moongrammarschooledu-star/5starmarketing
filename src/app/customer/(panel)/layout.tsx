import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { FavoritesProvider } from "@/components/customer/FavoritesProvider";
import { CompareProvider } from "@/components/customer/CompareProvider";
import { customerService } from "@/services/customerService";
import { favoritesService } from "@/services/favoritesService";

export const metadata: Metadata = {
  title: {
    default: "My Account",
    template: "%s | 5STAR.M Customer Portal",
  },
  robots: { index: false, follow: false },
};

// Every route under here is authenticated and reads live data.
export const dynamic = "force-dynamic";

export default async function CustomerPanelLayout({ children }: { children: ReactNode }) {
  const customer = await customerService.getCurrentCustomer();

  // The middleware already guarantees a logged-in session, but that
  // session might belong to an admin account (no customer_profiles row)
  // rather than a customer — send them back rather than rendering a
  // broken dashboard.
  if (!customer) {
    redirect("/login");
  }

  if (customer.disabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-12 text-center">
        <div className="max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="font-heading text-lg font-bold text-ink">Account Disabled</h1>
          <p className="mt-2 text-sm text-muted">
            Your account has been disabled. Please contact 5STAR.M Estate &amp; Builders for help.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Back to Website
          </Link>
        </div>
      </main>
    );
  }

  const favoriteIds = [...(await favoritesService.listPropertyIds(customer.id))];

  return (
    <FavoritesProvider initialFavoriteIds={favoriteIds} isLoggedIn>
      <CompareProvider>
        <CustomerShell customerName={customer.fullName}>{children}</CustomerShell>
      </CompareProvider>
    </FavoritesProvider>
  );
}
