import { NextResponse } from "next/server";
import { reportService } from "@/services/reportService";
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

export async function GET(request: Request) {
  if (!(await requireReportsAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
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
