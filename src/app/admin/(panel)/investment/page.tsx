import Link from "next/link";
import { LayoutDashboard, Calculator, Database, BarChart3, Settings, ArrowRight } from "lucide-react";
import { investmentReportService } from "@/services/investmentReportService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InvestmentIndexPage() {
  await requireSection("investment");
  const [stats, admin] = await Promise.all([investmentReportService.dashboardStats(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Property Valuation &amp; Investment Intelligence</h1>
      <p className="mt-1 text-sm text-muted">Valuations, market data, rental yield/ROI calculators and investment reports — all from real, verified data.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Properties Analyzed" value={String(stats.totalPropertiesAnalyzed)} />
        <StatCard label="Valuation Reports" value={String(stats.totalValuationReports)} />
        <StatCard label="Avg. Rental Yield" value={stats.averageRentalYield != null ? `${stats.averageRentalYield.toFixed(1)}%` : "Insufficient verified data"} />
        <StatCard label="Saved Analyses" value={String(stats.savedAnalysesCount)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard href="/admin/investment/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Full investment intelligence dashboard with trends." />
        <NavCard href="/admin/investment/valuation" icon={Calculator} title="Valuations" desc="Create and review property valuations." />
        <NavCard href="/admin/investment/market-data" icon={Database} title="Market Data" desc="Manage verified market intelligence records." />
        <NavCard href="/admin/investment/reports" icon={BarChart3} title="Reports" desc="Investment scenario rules and exports." />
        {canManage && <NavCard href="/admin/investment/settings" icon={Settings} title="Settings" desc="Area conversion, thresholds, disclaimer, currency." />}
      </div>

      {stats.totalPropertiesAnalyzed === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">Insufficient verified data for this analysis — create your first valuation to get started.</div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

function NavCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof LayoutDashboard; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 hover:border-primary">
      <Icon className="h-6 w-6 text-primary" />
      <p className="mt-3 font-heading text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
