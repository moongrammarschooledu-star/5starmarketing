import Link from "next/link";
import { LayoutDashboard, FolderKanban, Settings, ArrowRight, Plus } from "lucide-react";
import { constructionReportService } from "@/services/constructionReportService";
import { constructionProjectService } from "@/services/constructionProjectService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ConstructionIndexPage() {
  await requireSection("construction");
  const [stats, projects, admin] = await Promise.all([constructionReportService.dashboardStats(), constructionProjectService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageConstruction(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Construction Project Management</h1>
          <p className="mt-1 text-sm text-muted">Projects, phases, BOQ, materials, procurement, contractors, budgets and handover — all from real, recorded data.</p>
        </div>
        {canManage && (
          <Link href="/admin/construction/projects/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active Projects" value={String(stats.activeProjects)} />
        <StatCard label="Delayed" value={String(stats.delayedProjects)} accent={stats.delayedProjects > 0} />
        <StatCard label="At Risk" value={String(stats.atRiskProjects)} accent={stats.atRiskProjects > 0} />
        <StatCard label="Completed" value={String(stats.completedProjects)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Approved Budget" value={formatPKR(stats.totalApprovedBudget)} />
        <StatCard label="Actual Expenditure" value={formatPKR(stats.totalActualExpenditure)} />
        <StatCard label="Open Change Orders" value={String(stats.openChangeOrders)} />
        <StatCard label="Active Contractors" value={String(stats.activeContractors)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard href="/admin/construction/dashboard" icon={LayoutDashboard} title="Dashboard" desc="Charts, budget vs actual, contractor performance." />
        <NavCard href="/admin/construction/projects" icon={FolderKanban} title="Projects" desc="Every construction project and its full workflow." />
        {canManage && <NavCard href="/admin/construction/settings" icon={Settings} title="Settings" desc="Budget alert thresholds, retention, currency." />}
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Recent Projects</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Project #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approved Budget</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/construction/projects/${p.id}/overview`} className="font-semibold text-primary hover:underline">
                      {p.projectNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{p.projectName}</td>
                  <td className="px-4 py-3 text-muted">{p.projectType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{p.approvedBudget != null ? formatPKR(p.approvedBudget) : "—"}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    No construction projects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
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
