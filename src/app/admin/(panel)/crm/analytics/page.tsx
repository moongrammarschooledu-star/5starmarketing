import { AlertTriangle, TrendingUp, Users, MapPin, CheckCircle2, XCircle, Handshake, Timer, Hourglass } from "lucide-react";
import { crmAnalyticsService } from "@/services/crmAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import { StatCard } from "@/components/admin/StatCard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CrmAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("leads");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let summary: Awaited<ReturnType<typeof crmAnalyticsService.summary>> | null = null;
  let agents: Awaited<ReturnType<typeof crmAnalyticsService.agentPerformance>> = [];
  let properties: Awaited<ReturnType<typeof crmAnalyticsService.propertyPerformance>> = [];
  let projects: Awaited<ReturnType<typeof crmAnalyticsService.projectPerformance>> = [];
  let campaigns: Awaited<ReturnType<typeof crmAnalyticsService.campaignPerformance>> = [];
  let loadError: string | null = null;

  try {
    [summary, agents, properties, projects, campaigns] = await Promise.all([
      crmAnalyticsService.summary(range),
      crmAnalyticsService.agentPerformance(range),
      crmAnalyticsService.propertyPerformance(range),
      crmAnalyticsService.projectPerformance(range),
      crmAnalyticsService.campaignPerformance(range),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load CRM analytics.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">CRM Analytics</h1>
          <p className="mt-1 text-sm text-muted">Real performance, straight from the pipeline — nothing here is estimated.</p>
        </div>
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={new Date().toLocaleTimeString("en-GB")} />
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {summary && (
        <>
          {!summary.hasEnoughData && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> Not enough leads in this range for reliable conversion rates yet — counts below are still real.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Leads" value={summary.totalLeads} icon={Users} />
            <StatCard label="Qualified" value={summary.qualifiedLeads} icon={CheckCircle2} tone="success" />
            <StatCard label="Site Visits" value={summary.siteVisits} icon={MapPin} />
            <StatCard label="Negotiations" value={summary.negotiations} icon={Handshake} tone="primary" />
            <StatCard label="Converted" value={summary.converted} icon={CheckCircle2} tone="success" />
            <StatCard label="Lost" value={summary.lost} icon={XCircle} />
            <StatCard label="Conversion Rate" value={summary.conversionRate !== null ? `${Math.round(summary.conversionRate * 100)}%` : "No sufficient data"} icon={TrendingUp} tone="primary" />
            <StatCard label="Avg. Response Time" value={summary.averageResponseTimeHours !== null ? `${summary.averageResponseTimeHours}h` : "No sufficient data"} icon={Timer} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Avg. Conversion Time" value={summary.averageConversionTimeDays !== null ? `${summary.averageConversionTimeDays} days` : "No sufficient data"} icon={Hourglass} />
          </div>

          <div className="mt-6">
            <CountBucketChart title="Leads by Source" data={summary.bySource} empty="No leads in this date range." />
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Agent Performance</h2>
        {agents.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No leads assigned to agents in this date range.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Contacted</th>
                  <th className="px-3 py-2">Qualified</th>
                  <th className="px-3 py-2">Site Visits</th>
                  <th className="px-3 py-2">Converted</th>
                  <th className="px-3 py-2">Lost</th>
                  <th className="px-3 py-2">Conversion Rate</th>
                  <th className="px-3 py-2">Follow-Ups Done</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.agentId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 font-semibold text-ink">{a.agentName}</td>
                    <td className="px-3 py-2.5 text-muted">{a.assigned}</td>
                    <td className="px-3 py-2.5 text-muted">{a.contacted}</td>
                    <td className="px-3 py-2.5 text-muted">{a.qualified}</td>
                    <td className="px-3 py-2.5 text-muted">{a.siteVisits}</td>
                    <td className="px-3 py-2.5 text-muted">{a.converted}</td>
                    <td className="px-3 py-2.5 text-muted">{a.lost}</td>
                    <td className="px-3 py-2.5 text-muted">{a.conversionRate !== null ? `${Math.round(a.conversionRate * 100)}%` : "No sufficient data"}</td>
                    <td className="px-3 py-2.5 text-muted">{a.followUpsCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PerformanceTable title="Property Lead Performance" rows={properties} nameKey="propertyTitle" />
        <PerformanceTable title="Project Lead Performance" rows={projects} nameKey="projectName" />
      </div>

      <div className="mt-6">
        <PerformanceTable title="Campaign Lead Performance" rows={campaigns} nameKey="campaignName" hideSiteVisits />
      </div>
    </div>
  );
}

function PerformanceTable<T extends { leads: number; converted: number; siteVisits?: number }>({
  title,
  rows,
  nameKey,
  hideSiteVisits,
}: {
  title: string;
  rows: T[];
  nameKey: keyof T;
  hideSiteVisits?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No leads in this date range.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Leads</th>
                {!hideSiteVisits && <th className="px-3 py-2">Site Visits</th>}
                <th className="px-3 py-2">Converted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-semibold text-ink">{String(r[nameKey])}</td>
                  <td className="px-3 py-2.5 text-muted">{r.leads}</td>
                  {!hideSiteVisits && <td className="px-3 py-2.5 text-muted">{r.siteVisits}</td>}
                  <td className="px-3 py-2.5 text-muted">{r.converted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
