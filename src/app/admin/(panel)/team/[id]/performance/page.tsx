import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { teamService } from "@/services/teamService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "No performance data available yet." : `${Math.round(v * 100)}%`;
}

function formatHours(v: number | null): string {
  return v === null ? "No performance data available yet." : `${v.toFixed(1)} hours`;
}

export default async function AdminTeamMemberPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("team");
  const { id } = await params;
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  const member = await teamService.getById(id);
  if (!member) notFound();

  const performance = await teamService.performanceFor(id, range.from);
  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
  const hasData = performance.assigned > 0;

  return (
    <div>
      <Link href={`/admin/team/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {member.name}
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">{member.name} — Performance</h1>
      <p className="mt-1 text-sm text-muted">Real metrics only, for {range.label.toLowerCase()}.</p>

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
      </div>

      {!hasData ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No performance data available yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricBox label="Assigned" value={performance.assigned} />
          <MetricBox label="Contacted" value={performance.contacted} />
          <MetricBox label="Interested" value={performance.interested} />
          <MetricBox label="Site Visits" value={performance.siteVisits} />
          <MetricBox label="Closed" value={performance.closed} />
          <MetricBox label="Lost" value={performance.lost} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Conversion Rate</h3>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{formatPercent(performance.conversionRate)}</p>
          <p className="mt-1 text-xs text-muted">Closed ÷ Assigned leads, this period.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Average Follow-Up Completion</h3>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{formatHours(performance.avgFollowUpCompletionHours)}</p>
          <p className="mt-1 text-xs text-muted">Time from scheduling to marking a follow-up complete.</p>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <div className="font-heading text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
