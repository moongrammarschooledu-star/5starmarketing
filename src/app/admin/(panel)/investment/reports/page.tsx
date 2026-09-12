import Link from "next/link";
import { ArrowLeft, Download, Settings, Layers } from "lucide-react";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InvestmentReportsPage() {
  await requireSection("investment");
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/investment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Investment
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Investment Reports</h1>
      <p className="mt-1 text-sm text-muted">Export real valuation and market data records, or manage the scenarios and settings behind every projection.</p>

      {canManage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a href="/admin/investment/export?type=valuations" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Export Valuations (CSV)</p>
              <p className="text-xs text-muted">Every valuation record, all versions, across all properties.</p>
            </div>
          </a>
          <a href="/admin/investment/export?type=market-data" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Export Market Data (CSV)</p>
              <p className="text-xs text-muted">All market data records including DRAFT and ARCHIVED.</p>
            </div>
          </a>
          <Link href="/admin/investment/settings" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Appreciation Scenarios</p>
              <p className="text-xs text-muted">Manage Conservative / Base / Optimistic rates.</p>
            </div>
          </Link>
          <Link href="/admin/investment/settings" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 hover:border-primary">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-ink">Investment Settings</p>
              <p className="text-xs text-muted">Area conversion, thresholds, expense defaults, disclaimer, currency.</p>
            </div>
          </Link>
        </div>
      )}

      {!canManage && <p className="mt-6 text-sm text-muted">Reports and exports are available to finance-authorized roles.</p>}
    </div>
  );
}
