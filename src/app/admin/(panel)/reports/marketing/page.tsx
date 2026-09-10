import Link from "next/link";
import type { ReactNode } from "react";
import { Download, Megaphone, Users2, Tags, Layers, Wallet, Filter } from "lucide-react";
import { campaignService } from "@/services/campaignService";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { MarketingFunnelChart } from "@/components/admin/MarketingFunnelChart";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "No sufficient data available." : `${Math.round(v * 100)}%`;
}

export default async function AdminMarketingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("marketing");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });
  const rangeQuery = `range=${range.key}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  let loadError: string | null = null;
  let campaigns: Awaited<ReturnType<typeof campaignService.list>> = [];
  let sources: Awaited<ReturnType<typeof marketingAnalyticsService.sourcesReport>> = [];
  let utmRows: Awaited<ReturnType<typeof marketingAnalyticsService.utmPerformance>> = [];
  let platformRows: Awaited<ReturnType<typeof marketingAnalyticsService.platformPerformance>> = [];
  let funnel: Awaited<ReturnType<typeof marketingAnalyticsService.funnel>> | null = null;

  try {
    [campaigns, sources, utmRows, platformRows, funnel] = await Promise.all([
      campaignService.list(),
      marketingAnalyticsService.sourcesReport(range),
      marketingAnalyticsService.utmPerformance(range),
      marketingAnalyticsService.platformPerformance(),
      marketingAnalyticsService.funnel(range),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load marketing reports.";
  }

  const campaignPerformance = await Promise.all(
    campaigns.map(async (c) => ({ campaign: c, performance: await campaignService.performance(c.id, range), cost: await campaignService.cost(c.id) }))
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing Reports</h1>
      <p className="mt-1 text-sm text-muted">Campaign performance, lead sources, UTM breakdown, platform comparison and cost analysis — export as CSV.</p>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>
      )}

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })} />
      </div>

      <ReportSection title="Campaign Performance" icon={Megaphone} exportHref={`/admin/reports/export?type=campaign-performance&${rangeQuery}`}>
        {campaignPerformance.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Leads</th>
                  <th className="py-2 pr-3">Qualified</th>
                  <th className="py-2 pr-3">Site Visits</th>
                  <th className="py-2 pr-3">Closed</th>
                  <th className="py-2">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {campaignPerformance.map(({ campaign, performance }) => (
                  <tr key={campaign.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/marketing/campaigns/${campaign.id}`} className="font-semibold text-ink hover:text-primary">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-muted">{performance.leads}</td>
                    <td className="py-2 pr-3 text-muted">{performance.qualifiedLeads}</td>
                    <td className="py-2 pr-3 text-muted">{performance.siteVisits}</td>
                    <td className="py-2 pr-3 text-muted">{performance.closedLeads}</td>
                    <td className="py-2 text-muted">{formatPercent(performance.leadConversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Lead Sources" icon={Users2} exportHref={`/admin/reports/export?type=utm-sources&${rangeQuery}`}>
        <CountBucketChart title="" data={sources.filter((s) => s.leads > 0).map((s) => ({ label: s.source, count: s.leads }))} empty="No attributed leads in this period yet." />
      </ReportSection>

      <ReportSection title="UTM Performance" icon={Tags} exportHref={`/admin/reports/export?type=utm-performance&${rangeQuery}`}>
        {utmRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No UTM-tagged leads in this period yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Medium</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Leads</th>
                  <th className="py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {utmRows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 text-muted">{r.source}</td>
                    <td className="py-2 pr-3 text-muted">{r.medium}</td>
                    <td className="py-2 pr-3 text-muted">{r.campaign}</td>
                    <td className="py-2 pr-3 text-ink">{r.leads}</td>
                    <td className="py-2 text-ink">{r.closedLeads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Platform Performance" icon={Layers} exportHref={`/admin/reports/export?type=platform-performance&${rangeQuery}`}>
        <CountBucketChart title="" data={platformRows.map((r) => ({ label: r.platform, count: r.leads }))} empty="No campaigns with leads yet." />
      </ReportSection>

      <ReportSection title="Cost Analysis" icon={Wallet} exportHref={`/admin/reports/export?type=cost-analysis&${rangeQuery}`}>
        {campaignPerformance.filter(({ campaign }) => campaign.actualSpend).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No campaign has actual spend entered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Spent</th>
                  <th className="py-2 pr-3">Cost / Lead</th>
                  <th className="py-2">Budget Status</th>
                </tr>
              </thead>
              <tbody>
                {campaignPerformance
                  .filter(({ campaign }) => campaign.actualSpend)
                  .map(({ campaign, cost }) => (
                    <tr key={campaign.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-semibold text-ink">{campaign.name}</td>
                      <td className="py-2 pr-3 text-muted">Rs. {cost.spent?.toLocaleString("en-PK")}</td>
                      <td className="py-2 pr-3 text-muted">{cost.costPerLead !== null ? `Rs. ${cost.costPerLead.toLocaleString("en-PK", { maximumFractionDigits: 0 })}` : "Not available"}</td>
                      <td className="py-2 text-muted">{cost.overBudget ? "Over Budget" : "On Track"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Conversion Funnel" icon={Filter} exportHref={`/admin/reports/export?type=conversion-funnel&${rangeQuery}`}>
        {funnel && <MarketingFunnelChart funnel={funnel} />}
      </ReportSection>
    </div>
  );
}

function ReportSection({
  title,
  icon: Icon,
  exportHref,
  children,
}: {
  title: string;
  icon: typeof Megaphone;
  exportHref: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Icon className="h-4.5 w-4.5 text-primary" /> {title}
        </h2>
        <a href={exportHref} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
          <Download className="h-3.5 w-3.5" /> CSV
        </a>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
