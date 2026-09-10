import Link from "next/link";
import { AlertTriangle, Megaphone, Zap, Users, TrendingUp, ThumbsUp, MapPin, CheckCircle2, Percent } from "lucide-react";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";
import { listPlatformIntegrations } from "@/lib/integrations";
import { StatCard } from "@/components/admin/StatCard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { MarketingFunnelChart } from "@/components/admin/MarketingFunnelChart";
import { PlatformIntegrationsStatus } from "@/components/admin/PlatformIntegrationsStatus";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export default async function AdminMarketingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("marketing");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let loadError: string | null = null;
  let stats: Awaited<ReturnType<typeof marketingAnalyticsService.dashboardStats>> | null = null;
  let topCampaigns: Awaited<ReturnType<typeof marketingAnalyticsService.topCampaigns>> = [];
  let sources: Awaited<ReturnType<typeof marketingAnalyticsService.sourcesReport>> = [];
  let funnel: Awaited<ReturnType<typeof marketingAnalyticsService.funnel>> | null = null;

  try {
    [stats, topCampaigns, sources, funnel] = await Promise.all([
      marketingAnalyticsService.dashboardStats(),
      marketingAnalyticsService.topCampaigns(5),
      marketingAnalyticsService.sourcesReport(range),
      marketingAnalyticsService.funnel(range),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the marketing dashboard.";
  }

  const topSourcesData = sources.filter((s) => s.leads > 0).map((s) => ({ label: s.source, count: s.leads })).sort((a, b) => b.count - a.count);
  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Command Center</h1>
          <p className="mt-1 text-sm text-muted">Real campaign, lead-source and funnel data — nothing here is invented.</p>
        </div>
        <Link href="/admin/marketing/campaigns/create" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          New Campaign
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard label="Campaigns" value={stats.totalCampaigns} icon={Megaphone} />
          <StatCard label="Active" value={stats.activeCampaigns} icon={Zap} tone="primary" />
          <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} />
          <StatCard label="Leads This Month" value={stats.leadsThisMonth} icon={TrendingUp} />
          <StatCard label="Qualified Leads" value={stats.qualifiedLeads} icon={ThumbsUp} tone="success" />
          <StatCard label="Site Visits" value={stats.siteVisits} icon={MapPin} />
          <StatCard label="Closed Leads" value={stats.closedLeads} icon={CheckCircle2} tone="success" />
          <StatCard label="Conversion Rate" value={formatPercent(stats.conversionRate)} icon={Percent} tone="primary" />
        </div>
      )}

      <div className="mt-8">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Applies to Top Sources and the Conversion Funnel below. Top-line stats above are all-time.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CountBucketChart title="Top Sources" data={topSourcesData} empty="No attributed leads in this period yet." />

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-heading text-sm font-bold text-ink">Top Campaigns</h3>
          {topCampaigns.length === 0 ? (
            <p className="mt-8 pb-8 text-center text-sm text-muted">No campaign-attributed leads yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-2">Campaign</th>
                    <th className="py-2 pr-2">Leads</th>
                    <th className="py-2 pr-2">Site Visits</th>
                    <th className="py-2">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((c) => (
                    <tr key={c.campaignId} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2">
                        <Link href={`/admin/marketing/campaigns/${c.campaignId}`} className="font-semibold text-ink hover:text-primary">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-muted">{c.leads}</td>
                      <td className="py-2 pr-2 text-muted">{c.siteVisits}</td>
                      <td className="py-2 text-muted">{c.closedLeads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {funnel && (
        <div className="mt-4">
          <MarketingFunnelChart funnel={funnel} />
        </div>
      )}

      <div className="mt-4">
        <PlatformIntegrationsStatus integrations={listPlatformIntegrations()} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/marketing/campaigns" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Manage Campaigns
        </Link>
        <Link href="/admin/marketing/sources" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Lead Source Report
        </Link>
        <Link href="/admin/marketing/calendar" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Marketing Calendar
        </Link>
        <Link href="/admin/reports/marketing" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Marketing Reports
        </Link>
        <Link href="/admin/settings/marketing" className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
          Marketing Settings
        </Link>
      </div>
    </div>
  );
}
