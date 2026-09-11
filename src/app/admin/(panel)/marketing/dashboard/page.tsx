import Link from "next/link";
import { Users, Sparkles, ThumbsUp, MapPin, Handshake, CheckCircle2, Wallet, TrendingUp, Target, DollarSign, Award, ArrowRight } from "lucide-react";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { campaignService } from "@/services/campaignService";
import { dealService } from "@/services/dealService";
import { crmAnalyticsService } from "@/services/crmAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import { formatPKR } from "@/lib/calculator";
import { StatCard } from "@/components/admin/StatCard";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function MarketingDashboardPage() {
  await requireSection("marketing");

  const yearRange = resolveDateRange("year");
  const [stats, campaigns, dealStats, topCampaigns, sources, agentPerf, propertyPerf] = await Promise.all([
    marketingAnalyticsService.dashboardStats(),
    campaignService.list(),
    dealService.dashboardStats(),
    marketingAnalyticsService.topCampaigns(1),
    marketingAnalyticsService.sourcesReport(),
    crmAnalyticsService.agentPerformance(yearRange),
    crmAnalyticsService.propertyPerformance(yearRange),
  ]);

  // Aggregate spend/revenue across every campaign with real numbers
  // entered — never estimated, and "Not configured" whenever a campaign
  // hasn't had spend/revenue entered at all.
  const spentCampaigns = campaigns.filter((c) => c.actualSpend !== undefined);
  const totalSpend = spentCampaigns.reduce((sum, c) => sum + (c.actualSpend ?? 0), 0);
  const revenueCampaigns = campaigns.filter((c) => c.revenueGenerated !== undefined);
  const totalRevenue = revenueCampaigns.reduce((sum, c) => sum + (c.revenueGenerated ?? 0), 0);
  const hasSpendData = spentCampaigns.length > 0 && totalSpend > 0;
  const hasRevenueData = revenueCampaigns.length > 0;

  const cpl = hasSpendData && stats.totalLeads > 0 ? totalSpend / stats.totalLeads : null;
  const cpql = hasSpendData && stats.qualifiedLeads > 0 ? totalSpend / stats.qualifiedLeads : null;
  const cpa = hasSpendData && stats.closedLeads > 0 ? totalSpend / stats.closedLeads : null;
  const roi = hasSpendData && hasRevenueData ? ((totalRevenue - totalSpend) / totalSpend) * 100 : null;

  const bestCampaign = topCampaigns[0];
  const bestSource = [...sources].sort((a, b) => b.leads - a.leads)[0];
  const bestAgent = [...agentPerf].sort((a, b) => b.converted - a.converted)[0];
  const bestProperty = [...propertyPerf].sort((a, b) => b.converted - a.converted)[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Marketing &amp; Conversion Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            The full visitor-to-customer funnel. For campaign management see{" "}
            <Link href="/admin/marketing" className="font-semibold text-primary hover:underline">
              Marketing Command Center
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} />
        <StatCard label="This Month" value={stats.leadsThisMonth} icon={Sparkles} tone="primary" />
        <StatCard label="Qualified" value={stats.qualifiedLeads} icon={ThumbsUp} tone="success" />
        <StatCard label="Site Visits" value={stats.siteVisits} icon={MapPin} />
        <StatCard label="Active Deals" value={dealStats.active} icon={Handshake} tone="primary" />
        <StatCard label="Converted" value={stats.closedLeads} icon={CheckCircle2} tone="success" />
        <StatCard label="Conversion Rate" value={stats.conversionRate !== null ? `${(stats.conversionRate * 100).toFixed(1)}%` : "N/A"} icon={Target} />
        <StatCard label="Revenue Attributed" value={hasRevenueData ? formatPKR(totalRevenue) : "Not configured"} icon={DollarSign} tone="success" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Marketing Spend" value={hasSpendData ? formatPKR(totalSpend) : "Not configured"} icon={Wallet} />
        <MetricCard label="Cost Per Lead" value={cpl !== null ? formatPKR(cpl) : "Not available"} icon={Wallet} />
        <MetricCard label="Cost Per Qualified Lead" value={cpql !== null ? formatPKR(cpql) : "Not available"} icon={Wallet} />
        <MetricCard label="Cost Per Acquisition" value={cpa !== null ? formatPKR(cpa) : "Not available"} icon={Wallet} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">ROI</span>
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{roi !== null ? `${roi.toFixed(1)}%` : "Marketing cost not configured"}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            <Award className="h-4.5 w-4.5 text-primary" /> Best Performers
          </h2>
          <div className="mt-4 space-y-2.5 text-sm">
            <Best label="Best Campaign" value={bestCampaign ? `${bestCampaign.name} (${bestCampaign.leads} leads)` : "No campaign data yet"} href={bestCampaign ? `/admin/marketing/campaigns/${bestCampaign.campaignId}` : undefined} />
            <Best label="Best Source" value={bestSource && bestSource.leads > 0 ? `${bestSource.source} (${bestSource.leads} leads)` : "No source data yet"} />
            <Best label="Best Agent" value={bestAgent ? `${bestAgent.agentName} (${bestAgent.converted} converted)` : "No agent data yet"} href="/admin/crm/analytics" />
            <Best label="Best Property" value={bestProperty ? `${bestProperty.propertyTitle} (${bestProperty.converted} converted)` : "No property data yet"} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-heading text-base font-bold text-ink">Explore Further</h2>
          <div className="mt-4 space-y-2">
            <ExploreLink href="/admin/marketing/leads" label="Hot &amp; scored leads" />
            <ExploreLink href="/admin/marketing/automation" label="Automation workflows" />
            <ExploreLink href="/admin/marketing/analytics" label="Response time, SLA &amp; re-engagement" />
            <ExploreLink href="/admin/reports/marketing" label="Campaign &amp; UTM performance reports" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <p className="mt-2 font-heading text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

function Best({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

function ExploreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm font-semibold text-ink hover:bg-primary/5 hover:text-primary">
      {label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
