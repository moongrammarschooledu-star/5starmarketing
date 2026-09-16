import Link from "next/link";
import { UserCircle, LogOut } from "lucide-react";
import { customerService } from "@/services/customerService";
import { mobilePreferencesService } from "@/services/mobilePreferencesService";
import { NotificationPreferencesForm } from "@/components/pwa/NotificationPreferencesForm";
import { PushSubscribeToggle } from "@/components/pwa/PushSubscribeToggle";
import { logoutAction } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";

/** STEP 31 section 41 — deliberately doesn't duplicate the existing
 *  /customer/profile form (name/phone/email/password already live
 *  there). This page covers only what's new to this step: push
 *  notifications, per-category preferences, and app-level settings. */
export default async function CustomerSettingsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;
  const prefs = await mobilePreferencesService.get("CUSTOMER", customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Settings</h1>

      <section className="mt-5">
        <h2 className="font-heading text-sm font-bold text-ink">Account</h2>
        <Link
          href="/customer/profile"
          className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm font-semibold text-ink"
        >
          <UserCircle className="h-4.5 w-4.5 text-primary" /> Profile, phone & password
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="font-heading text-sm font-bold text-ink">Notifications on this device</h2>
        <div className="mt-2">
          <PushSubscribeToggle />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-heading text-sm font-bold text-ink">What you get notified about</h2>
        <div className="mt-2">
          <NotificationPreferencesForm initial={prefs} />
        </div>
      </section>

      <section className="mt-6">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-danger/30 px-4 py-3 text-sm font-bold text-danger"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </form>
      </section>
    </div>
  );
}
