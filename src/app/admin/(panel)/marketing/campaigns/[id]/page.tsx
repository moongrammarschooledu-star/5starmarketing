import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Calendar, Wallet, Target, Building2, FolderKanban } from "lucide-react";
import { campaignService, resolveLandingPagePath, buildCampaignUrl, buildCampaignQrUrl, buildCampaignWhatsAppUrl } from "@/services/campaignService";
import { settingsService } from "@/services/settingsService";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { requireSection } from "@/lib/guard";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CampaignAssets } from "@/components/admin/CampaignAssets";
import { formatDateOnly } from "@/lib/date";
import clsx from "clsx";

export const dynamic = "force-dynamic";

function formatPercent(v: number | null): string {
  return v === null ? "No sufficient data available." : `${Math.round(v * 100)}%`;
}

function formatMoney(v: number | undefined): string {
  return v === undefined ? "—" : `Rs. ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function formatCost(v: number | null): string {
  return v === null ? "Not available" : `Rs. ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

const STATUS_TONE: Record<string, string> = {
  Draft: "bg-muted/20 text-muted",
  Active: "bg-success/10 text-success",
  Paused: "bg-amber-500/10 text-amber-600",
  Completed: "bg-primary/10 text-primary",
  Archived: "bg-ink/10 text-ink",
};

export default async function AdminCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("marketing");
  const { id } = await params;
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  const campaign = await campaignService.getById(id);
  if (!campaign) notFound();

  const [performance, cost, roi, settings] = await Promise.all([
    campaignService.performance(id, range),
    campaignService.cost(id),
    campaignService.roi(id),
    settingsService.get(),
  ]);

  const landingPath = resolveLandingPagePath(campaign);
  const campaignUrl = buildCampaignUrl(campaign, landingPath);
  const qrUrl = buildCampaignQrUrl(campaign, landingPath);
  const qrDataUrl = await generateQrCodeDataUrl(qrUrl);
  const whatsappUrl = buildCampaignWhatsAppUrl(campaign, settings.whatsapp);

  return (
    <div>
      <Link href="/admin/marketing/campaigns" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {campaign.platform} · {campaign.campaignType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_TONE[campaign.status])}>{campaign.status}</span>
          <Link href={`/admin/marketing/campaigns/${id}/edit`} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoBox icon={Calendar} label="Dates" value={`${campaign.startDate ? formatDateOnly(campaign.startDate) : "—"} – ${campaign.endDate ? formatDateOnly(campaign.endDate) : "—"}`} />
        <InfoBox icon={Wallet} label="Budget" value={formatMoney(campaign.plannedBudget)} />
        {campaign.propertyTitle && <InfoBox icon={Building2} label="Property" value={campaign.propertyTitle} />}
        {campaign.projectTitle && <InfoBox icon={FolderKanban} label="Project" value={campaign.projectTitle} />}
        {!campaign.propertyTitle && !campaign.projectTitle && <InfoBox icon={Target} label="Target Audience" value={campaign.targetAudience ?? "—"} />}
      </div>

      {campaign.description && <p className="mt-4 text-sm text-muted">{campaign.description}</p>}

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricBox label="Visitors" value={performance.visitors} />
        <MetricBox label="Leads" value={performance.leads} />
        <MetricBox label="Qualified Leads" value={performance.qualifiedLeads} />
        <MetricBox label="Site Visits" value={performance.siteVisits} />
        <MetricBox label="Closed Leads" value={performance.closedLeads} />
      </div>

      {!performance.hasEnoughData && (
        <p className="mt-3 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          No sufficient data available for reliable conversion rates yet — at least 5 leads are needed.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RateBox label="Lead Conversion Rate" value={formatPercent(performance.leadConversionRate)} />
        <RateBox label="Qualified Lead Rate" value={formatPercent(performance.qualifiedLeadRate)} />
        <RateBox label="Site Visit Rate" value={formatPercent(performance.siteVisitRate)} />
        <RateBox label="Closed Lead Rate" value={formatPercent(performance.closedLeadRate)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Cost Analytics</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <CostRow label="Cost Per Lead" value={formatCost(cost.costPerLead)} />
            <CostRow label="Cost Per Qualified Lead" value={formatCost(cost.costPerQualifiedLead)} />
            <CostRow label="Cost Per Site Visit" value={formatCost(cost.costPerSiteVisit)} />
            <CostRow label="Cost Per Closed Lead" value={formatCost(cost.costPerClosedLead)} />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Budget</span>
              <span className="font-bold text-ink">{formatMoney(cost.budget)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Spent</span>
              <span className="font-bold text-ink">{formatMoney(cost.spent)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Remaining</span>
              <span className={clsx("font-bold", cost.overBudget ? "text-primary" : "text-ink")}>
                {cost.overBudget ? "Over Budget" : cost.remaining !== null ? formatMoney(cost.remaining) : "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">ROI</h2>
          <p className="mt-1 text-xs text-muted">Only calculated from real, verified revenue — never estimated, never guaranteed.</p>
          <div className="mt-4">
            <div className="font-heading text-3xl font-extrabold text-ink">
              {roi.roiPercent === null ? "—" : `${roi.roiPercent >= 0 ? "+" : ""}${roi.roiPercent.toFixed(0)}%`}
            </div>
            {roi.roiPercent === null && <p className="mt-1 text-sm text-muted">Enter Revenue Generated on this campaign to calculate ROI.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <CampaignAssets campaign={campaign} campaignUrl={campaignUrl} qrDataUrl={qrDataUrl} whatsappUrl={whatsappUrl} />
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-ink">{value}</div>
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

function RateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-lg font-extrabold text-ink">{value}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-ink">{value}</div>
    </div>
  );
}
