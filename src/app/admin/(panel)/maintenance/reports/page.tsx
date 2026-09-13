import Link from "next/link";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";
import { maintenanceReportService } from "@/services/maintenanceReportService";
import { maintenanceAssetService } from "@/services/maintenanceAssetService";
import { maintenanceSettingsService } from "@/services/maintenanceSettingsService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function MaintenanceReportsPage() {
  await requireSection("maintenance");
  const [recurringIssues, settings, expiringWarranties, admin] = await Promise.all([
    maintenanceReportService.recurringIssues(),
    maintenanceSettingsService.get(),
    maintenanceAssetService.listExpiringWarranties(30),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Maintenance Reports</h1>
      <p className="mt-1 text-sm text-muted">Recurring issues, upcoming warranty expiries, and CSV exports — all from real, recorded data.</p>

      {canManage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a href="/admin/maintenance/export?type=requests" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Export Requests (CSV)</p>
              <p className="text-xs text-muted">Every maintenance request on record.</p>
            </div>
          </a>
          <a href="/admin/maintenance/export?type=work-orders" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Export Work Orders (CSV)</p>
              <p className="text-xs text-muted">Every work order, including costs.</p>
            </div>
          </a>
          <a href="/admin/maintenance/export?type=assets" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Export Assets (CSV)</p>
              <p className="text-xs text-muted">Every tracked asset and its condition.</p>
            </div>
          </a>
        </div>
      )}

      <div className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
          <AlertTriangle className="h-4.5 w-4.5 text-primary" /> Recurring Issues
        </h2>
        <p className="mt-1 text-xs text-muted">Same property + category repeated {settings.recurringIssueThresholdCount}+ times within {settings.recurringIssueWindowDays} days. Admin should investigate root cause — never auto-diagnosed.</p>
        <div className="mt-3 space-y-2">
          {recurringIssues.map((r, i) => (
            <div key={i} className="rounded-xl border border-amber-300 bg-amber-50 p-3.5">
              <p className="text-sm font-bold text-ink">
                {r.propertyTitle} — {r.category}
              </p>
              <p className="text-xs text-muted">Recurring issue detected: {r.count} requests in the last {r.windowDays} days.</p>
            </div>
          ))}
          {recurringIssues.length === 0 && <p className="text-sm text-muted">No recurring issues detected.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Upcoming Warranty Expiries</h2>
        <div className="mt-3 space-y-2">
          {expiringWarranties.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {w.assetNumber} — {w.assetCategory}
                </p>
                <p className="text-xs text-muted">
                  {w.propertyTitle ?? "—"} · {w.provider ?? "Provider not specified"}
                </p>
              </div>
              <span className="text-xs font-bold text-primary">Expires {new Date(w.expiryDate).toLocaleDateString("en-GB")}</span>
            </div>
          ))}
          {expiringWarranties.length === 0 && <p className="text-sm text-muted">No warranties expiring soon.</p>}
        </div>
      </div>
    </div>
  );
}
