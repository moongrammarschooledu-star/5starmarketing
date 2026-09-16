import { requireSection } from "@/lib/guard";
import { pwaAnalyticsService } from "@/services/pwaAnalyticsService";
import { isPushConfigured } from "@/lib/push/provider";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-center">
      <p className="text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

/** Real install-funnel numbers only (STEP 31 section 40/46) — gated on
 *  the existing "settings" permission tier rather than adding a new
 *  RBAC section for one analytics page. */
export default async function AdminMobilePage() {
  await requireSection("settings");
  const stats = await pwaAnalyticsService.stats(30);
  const pushConfigured = isPushConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Mobile App &amp; PWA</h1>
      <p className="mt-1 text-sm text-muted">Install-funnel activity over the last {stats.sinceDays} days.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Install Prompt Shown" value={stats.promptShown} />
        <StatCard label="Installed" value={stats.installed} />
        <StatCard label="Dismissed" value={stats.dismissed} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-sm font-bold text-ink">Push Notifications</h2>
        <p className="mt-2 text-sm text-muted">
          {pushConfigured ? (
            <>Web Push (VAPID) is configured — notifications are delivered for real.</>
          ) : (
            <>
              Not configured yet. Set <code className="rounded bg-surface-muted px-1.5 py-0.5">VAPID_PUBLIC_KEY</code>,{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5">VAPID_PRIVATE_KEY</code> and{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> to enable
              real push delivery — see .env.local.example.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
