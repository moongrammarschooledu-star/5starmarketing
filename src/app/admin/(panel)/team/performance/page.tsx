import Link from "next/link";
import { teamService } from "@/services/teamService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function formatHours(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}h`;
}

export default async function AdminTeamPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("team");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let loadError: string | null = null;
  let performance: Awaited<ReturnType<typeof teamService.performanceAll>> = [];
  try {
    performance = await teamService.performanceAll(range.from);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load team performance.";
  }

  const leadsByAgent = performance
    .filter((p) => p.assigned > 0)
    .map((p) => ({ label: p.agentName, count: p.assigned }))
    .sort((a, b) => b.count - a.count);

  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Team Performance</h1>
      <p className="mt-1 text-sm text-muted">Real, from-data metrics — nothing here is estimated.</p>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>
      )}

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CountBucketChart title="Leads by Agent" data={leadsByAgent} empty="No leads assigned to any agent in this period yet." />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Contacted</th>
              <th className="px-4 py-3">Interested</th>
              <th className="px-4 py-3">Site Visits</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Lost</th>
              <th className="px-4 py-3">Conversion</th>
              <th className="px-4 py-3">Avg. Follow-Up</th>
            </tr>
          </thead>
          <tbody>
            {performance.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  No performance data available yet.
                </td>
              </tr>
            )}
            {performance.map((p) => (
              <tr key={p.agentId} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/team/${p.agentId}/performance`} className="font-semibold text-ink hover:text-primary">
                    {p.agentName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{p.assigned}</td>
                <td className="px-4 py-3 text-muted">{p.contacted}</td>
                <td className="px-4 py-3 text-muted">{p.interested}</td>
                <td className="px-4 py-3 text-muted">{p.siteVisits}</td>
                <td className="px-4 py-3 text-muted">{p.closed}</td>
                <td className="px-4 py-3 text-muted">{p.lost}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPercent(p.conversionRate)}</td>
                <td className="px-4 py-3 text-muted">{formatHours(p.avgFollowUpCompletionHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
