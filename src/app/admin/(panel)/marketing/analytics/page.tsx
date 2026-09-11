import Link from "next/link";
import { Clock, AlertTriangle, Flame, UserX } from "lucide-react";
import { crmAnalyticsService } from "@/services/crmAnalyticsService";
import { leadScoringService } from "@/services/leadScoringService";
import { resolveDateRange } from "@/services/analyticsService";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function MarketingAnalyticsPage() {
  await requireSection("marketing");

  const [summary, breaches, reEngagement] = await Promise.all([
    crmAnalyticsService.summary(resolveDateRange("90d")),
    leadScoringService.listCurrentBreaches(),
    leadScoringService.listReEngagementCandidates(14),
  ]);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Automation Analytics</h1>
        <p className="mt-1 text-sm text-muted">Response time, SLA compliance, and re-engagement — from the last 90 days of real lead activity.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Avg. Response Time" value={summary.averageResponseTimeHours !== null ? `${summary.averageResponseTimeHours} hr` : "No sufficient data"} icon={Clock} />
        <StatCard label="Avg. Conversion Time" value={summary.averageConversionTimeDays !== null ? `${summary.averageConversionTimeDays} days` : "No sufficient data"} icon={Clock} />
        <StatCard label="SLA Breaches (open)" value={breaches.length} icon={AlertTriangle} tone={breaches.length > 0 ? "primary" : "default"} />
        <StatCard label="Re-engagement Queue (14+ days)" value={reEngagement.length} icon={UserX} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <AlertTriangle className="h-4.5 w-4.5 text-primary" /> SLA Breaches
          </h2>
          <p className="mt-1 text-xs text-muted">Open leads with no logged first contact within their score level&apos;s response time (configurable in Automation Rules).</p>
          <div className="mt-4 space-y-2">
            {breaches.length === 0 && <p className="text-sm text-muted">Nothing breached right now.</p>}
            {breaches.map((b) => (
              <Link key={b.id} href={`/admin/crm/leads/${b.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm hover:bg-primary/5">
                <span className="font-semibold text-ink">{b.name}</span>
                <StatusBadge status={b.scoreLevel} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <Flame className="h-4.5 w-4.5 text-primary" /> Re-Engagement Queue
          </h2>
          <p className="mt-1 text-xs text-muted">No activity in 14+ days — never auto-messaged, a human decides whether and how to reach back out.</p>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {reEngagement.length === 0 && <p className="text-sm text-muted">No inactive leads right now.</p>}
            {reEngagement.slice(0, 30).map((l) => (
              <Link key={l.id} href={`/admin/crm/leads/${l.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm hover:bg-primary/5">
                <div>
                  <p className="font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-muted-foreground">Last activity {new Date(l.lastActivityAt).toLocaleDateString("en-GB")}</p>
                </div>
                <StatusBadge status={l.scoreLevel} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Lead Source Breakdown (90 days)</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.bySource.map((s) => (
            <span key={s.label} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
              {s.label}: {s.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
