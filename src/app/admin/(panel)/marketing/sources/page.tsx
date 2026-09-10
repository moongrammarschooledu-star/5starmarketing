import { AlertTriangle } from "lucide-react";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export default async function AdminLeadSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("marketing");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let rows: Awaited<ReturnType<typeof marketingAnalyticsService.sourcesReport>> = [];
  let loadError: string | null = null;
  try {
    rows = await marketingAnalyticsService.sourcesReport(range);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the lead source report.";
  }

  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Lead Source Report</h1>
      <p className="mt-1 text-sm text-muted">
        Source attribution uses each lead&apos;s first touch — the channel that originally brought them in.
      </p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Visitors</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Qualified Leads</th>
              <th className="px-4 py-3">Site Visits</th>
              <th className="px-4 py-3">Closed Leads</th>
              <th className="px-4 py-3">Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3 font-semibold text-ink">{r.source}</td>
                <td className="px-4 py-3 text-muted">{r.visitors}</td>
                <td className="px-4 py-3 text-muted">{r.leads}</td>
                <td className="px-4 py-3 text-muted">{r.qualifiedLeads}</td>
                <td className="px-4 py-3 text-muted">{r.siteVisits}</td>
                <td className="px-4 py-3 text-muted">{r.closedLeads}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPercent(r.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
