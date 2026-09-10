import { NextResponse } from "next/server";
import { reportService } from "@/services/reportService";
import { campaignService } from "@/services/campaignService";
import { marketingAnalyticsService } from "@/services/marketingAnalyticsService";
import { resolveDateRange } from "@/services/analyticsService";
import { toCsv } from "@/lib/csv";
import type { DateRangeKey } from "@/lib/models/analytics";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";

// Route handlers aren't wrapped by the /admin layout, so this file must
// check auth + role itself — the /admin/:path* middleware already
// guarantees a session cookie exists, but a role restricted from the
// Reports section must not be able to hit this endpoint directly either.
async function requireReportsAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "reports");
}

const MARKETING_REPORT_TYPES = new Set(["campaign-performance", "utm-sources", "utm-performance", "platform-performance", "cost-analysis", "conversion-funnel"]);

async function requireMarketingAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "marketing");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  const authorized = MARKETING_REPORT_TYPES.has(type ?? "") ? await requireMarketingAccess() : await requireReportsAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const rangeKey = (url.searchParams.get("range") as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  let csv = "";
  let filename = "report.csv";

  try {
    if (type === "property") {
      const r = await reportService.propertyReport();
      filename = "property-report.csv";
      csv = toCsv(
        ["Metric", "Value"],
        [
          ["Total Properties", r.total],
          ["Available", r.available],
          ["Reserved", r.reserved],
          ["Sold", r.sold],
          ["Inactive", r.inactive],
          ["", ""],
          ["By Type", ""],
          ...r.byType.map((b) => [b.label, b.count]),
          ["", ""],
          ["By Location", ""],
          ...r.byLocation.map((b) => [b.label, b.count]),
        ]
      );
    } else if (type === "lead") {
      const r = await reportService.leadReport(range);
      filename = "lead-report.csv";
      csv = toCsv(
        ["Metric", "Value"],
        [
          [`Date Range`, range.label],
          ["Total Leads", r.total],
          ["New", r.new],
          ["Contacted", r.contacted],
          ["Interested", r.interested],
          ["Follow-Up", r.followUp],
          ["Closed", r.closed],
          ["Lost", r.lost],
          ["", ""],
          ["By Source", ""],
          ...r.bySource.map((b) => [b.label, b.count]),
          ["", ""],
          ["By Property", ""],
          ...r.byProperty.map((b) => [b.label, b.count]),
          ["", ""],
          ["By Date", ""],
          ...r.byDate.map((b) => [b.date, b.count]),
        ]
      );
    } else if (type === "project") {
      const r = await reportService.projectReport();
      filename = "project-report.csv";
      csv = toCsv(
        ["Metric", "Value"],
        [
          ["Total Projects", r.total],
          ["Upcoming", r.upcoming],
          ["Ongoing", r.ongoing],
          ["Completed", r.completed],
        ]
      );
    } else if (type === "marketing") {
      const sources = await reportService.marketingReport(range);
      filename = "marketing-report.csv";
      csv = toCsv(
        ["Source", "Leads", "Date Range"],
        sources.map((b) => [b.label, b.count, range.label])
      );
    } else if (type === "campaign-performance") {
      const campaigns = await campaignService.list();
      filename = "campaign-performance.csv";
      const rows = await Promise.all(
        campaigns.map(async (c) => {
          const perf = await campaignService.performance(c.id, range);
          return [c.name, c.platform, c.status, perf.leads, perf.qualifiedLeads, perf.siteVisits, perf.closedLeads, perf.leadConversionRate !== null ? `${Math.round(perf.leadConversionRate * 100)}%` : "No sufficient data"];
        })
      );
      csv = toCsv(["Campaign", "Platform", "Status", "Leads", "Qualified Leads", "Site Visits", "Closed Leads", "Conversion Rate"], rows);
    } else if (type === "utm-sources") {
      const sources = await marketingAnalyticsService.sourcesReport(range);
      filename = "lead-sources.csv";
      csv = toCsv(
        ["Source", "Visitors", "Leads", "Qualified Leads", "Site Visits", "Closed Leads", "Conversion Rate"],
        sources.map((r) => [r.source, r.visitors, r.leads, r.qualifiedLeads, r.siteVisits, r.closedLeads, r.conversionRate !== null ? `${Math.round(r.conversionRate * 100)}%` : "No sufficient data"])
      );
    } else if (type === "utm-performance") {
      const rows = await marketingAnalyticsService.utmPerformance(range);
      filename = "utm-performance.csv";
      csv = toCsv(
        ["UTM Source", "UTM Medium", "UTM Campaign", "Leads", "Closed Leads"],
        rows.map((r) => [r.source, r.medium, r.campaign, r.leads, r.closedLeads])
      );
    } else if (type === "platform-performance") {
      const rows = await marketingAnalyticsService.platformPerformance();
      filename = "platform-performance.csv";
      csv = toCsv(
        ["Platform", "Campaigns", "Leads", "Closed Leads"],
        rows.map((r) => [r.platform, r.campaigns, r.leads, r.closedLeads])
      );
    } else if (type === "cost-analysis") {
      const campaigns = await campaignService.list();
      filename = "cost-analysis.csv";
      const rows = await Promise.all(
        campaigns.map(async (c) => {
          const cost = await campaignService.cost(c.id);
          return [
            c.name,
            cost.budget ?? "",
            cost.spent ?? "",
            cost.costPerLead !== null ? cost.costPerLead.toFixed(0) : "Not available",
            cost.costPerQualifiedLead !== null ? cost.costPerQualifiedLead.toFixed(0) : "Not available",
            cost.costPerSiteVisit !== null ? cost.costPerSiteVisit.toFixed(0) : "Not available",
            cost.costPerClosedLead !== null ? cost.costPerClosedLead.toFixed(0) : "Not available",
            cost.overBudget ? "Over Budget" : "On Track",
          ];
        })
      );
      csv = toCsv(["Campaign", "Budget", "Spent", "Cost/Lead", "Cost/Qualified Lead", "Cost/Site Visit", "Cost/Closed Lead", "Budget Status"], rows);
    } else if (type === "conversion-funnel") {
      const funnel = await marketingAnalyticsService.funnel(range);
      filename = "conversion-funnel.csv";
      csv = toCsv(
        ["Stage", "Count", "Date Range"],
        [
          ["Visitors", funnel.visitors, range.label],
          ["Property Views", funnel.propertyViews, range.label],
          ["Inquiries", funnel.inquiries, range.label],
          ["Qualified Leads", funnel.qualifiedLeads, range.label],
          ["Site Visits", funnel.siteVisits, range.label],
          ["Negotiations", funnel.negotiations, range.label],
          ["Closed Leads", funnel.closedLeads, range.label],
        ]
      );
    } else {
      return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
    }
  } catch (e) {
    console.error("reports/export failed:", e);
    return NextResponse.json({ error: "Could not generate this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
