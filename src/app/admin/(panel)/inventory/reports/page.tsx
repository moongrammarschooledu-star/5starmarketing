import { AlertTriangle, Boxes, Wallet } from "lucide-react";
import { inventoryService } from "@/services/inventoryService";
import { resolveDateRange } from "@/services/analyticsService";
import { StatCard } from "@/components/admin/StatCard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { formatPKR } from "@/lib/calculator";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function InventoryReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireSection("inventory");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let stats: Awaited<ReturnType<typeof inventoryService.dashboardStats>> | null = null;
  let projectSummaries: Awaited<ReturnType<typeof inventoryService.projectSummaries>> = [];
  let monthlyChanges: Awaited<ReturnType<typeof inventoryService.monthlyChanges>> = [];
  let loadError: string | null = null;

  try {
    [stats, projectSummaries, monthlyChanges] = await Promise.all([inventoryService.dashboardStats(), inventoryService.projectSummaries(), inventoryService.monthlyChanges(range)]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load inventory reports.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Inventory Reports</h1>
          <p className="mt-1 text-sm text-muted">Real inventory data — nothing here is estimated.</p>
        </div>
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={new Date().toLocaleTimeString("en-GB")} />
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Inventory" value={stats.total} icon={Boxes} />
            <StatCard label="Available" value={stats.available} icon={Boxes} tone="success" />
            <StatCard label="Total Value" value={formatPKR(stats.totalValue)} icon={Wallet} tone="primary" />
            <StatCard label="Sold Value" value={formatPKR(stats.soldValue)} icon={Wallet} tone="success" />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Availability Report — By Project</h2>
            {projectSummaries.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No project inventory yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Project</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Available</th>
                      <th className="px-3 py-2">Reserved</th>
                      <th className="px-3 py-2">Booked</th>
                      <th className="px-3 py-2">Sold</th>
                      <th className="px-3 py-2">Rented</th>
                      <th className="px-3 py-2">% Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummaries.map((s) => (
                      <tr key={s.projectId} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-ink">{s.projectName}</td>
                        <td className="px-3 py-2.5 text-ink">{s.total}</td>
                        <td className="px-3 py-2.5 text-success">{s.available}</td>
                        <td className="px-3 py-2.5 text-muted">{s.reserved}</td>
                        <td className="px-3 py-2.5 text-muted">{s.booked}</td>
                        <td className="px-3 py-2.5 text-muted">{s.sold}</td>
                        <td className="px-3 py-2.5 text-muted">{s.rented}</td>
                        <td className="px-3 py-2.5 text-muted">{s.total > 0 ? `${Math.round((s.sold / s.total) * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold text-ink">Monthly Inventory Changes</h2>
            {monthlyChanges.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Not enough history in this date range yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Month</th>
                      <th className="px-3 py-2">Units Added</th>
                      <th className="px-3 py-2">Units Reserved</th>
                      <th className="px-3 py-2">Units Released</th>
                      <th className="px-3 py-2">Units Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyChanges.map((m) => (
                      <tr key={m.month} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-ink">{m.month}</td>
                        <td className="px-3 py-2.5 text-muted">{m.added}</td>
                        <td className="px-3 py-2.5 text-muted">{m.reserved}</td>
                        <td className="px-3 py-2.5 text-muted">{m.released}</td>
                        <td className="px-3 py-2.5 text-success">{m.sold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
