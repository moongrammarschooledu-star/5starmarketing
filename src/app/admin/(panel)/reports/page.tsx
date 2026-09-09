import Link from "next/link";
import type { ReactNode } from "react";
import { Download, Printer, Building2, Users, FolderKanban, Megaphone } from "lucide-react";
import { reportService } from "@/services/reportService";
import { resolveDateRange } from "@/services/analyticsService";
import type { DateRangeKey } from "@/lib/models/analytics";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("reports");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });
  const rangeQuery = `range=${range.key}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  let loadError: string | null = null;
  let property: Awaited<ReturnType<typeof reportService.propertyReport>> | null = null;
  let lead: Awaited<ReturnType<typeof reportService.leadReport>> | null = null;
  let project: Awaited<ReturnType<typeof reportService.projectReport>> | null = null;
  let marketing: Awaited<ReturnType<typeof reportService.marketingReport>> = [];

  try {
    [property, lead, project, marketing] = await Promise.all([
      reportService.propertyReport(),
      reportService.leadReport(range),
      reportService.projectReport(),
      reportService.marketingReport(range),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load reports.";
  }

  const lastUpdated = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Business Reports</h1>
      <p className="mt-1 text-sm text-muted">
        Property, lead, project and marketing reports — export as CSV or a printable PDF.
      </p>

      {loadError && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          {loadError}
        </div>
      )}

      <div className="mt-6">
        <AnalyticsTimeFilter current={rangeKey} lastUpdated={lastUpdated} />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          The date range applies to the Lead and Marketing reports below. Property and Project reports always
          reflect current inventory.
        </p>
      </div>

      {/* PROPERTY REPORT */}
      <ReportSection
        title="Property Report"
        icon={Building2}
        exportHref="/admin/reports/export?type=property"
        printHref="/admin/reports-print/property"
      >
        {property && (
          <>
            <StatRow
              items={[
                { label: "Total", value: property.total },
                { label: "Available", value: property.available },
                { label: "Reserved", value: property.reserved },
                { label: "Sold", value: property.sold },
                { label: "Inactive", value: property.inactive },
              ]}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CountBucketChart title="By Type" data={property.byType} />
              <CountBucketChart title="By Location" data={property.byLocation} />
              <CountBucketChart title="By Status" data={property.byStatus} />
            </div>
          </>
        )}
      </ReportSection>

      {/* LEAD REPORT */}
      <ReportSection
        title={`Lead Report (${range.label})`}
        icon={Users}
        exportHref={`/admin/reports/export?type=lead&${rangeQuery}`}
        printHref={`/admin/reports-print/lead?${rangeQuery}`}
      >
        {lead && (
          <>
            <StatRow
              items={[
                { label: "Total", value: lead.total },
                { label: "New", value: lead.new },
                { label: "Contacted", value: lead.contacted },
                { label: "Interested", value: lead.interested },
                { label: "Follow-Up", value: lead.followUp },
                { label: "Closed", value: lead.closed },
                { label: "Lost", value: lead.lost },
              ]}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CountBucketChart title="By Source" data={lead.bySource} />
              <CountBucketChart title="By Property" data={lead.byProperty} />
              <CountBucketChart title="By Status" data={lead.byStatus} />
            </div>
          </>
        )}
      </ReportSection>

      {/* PROJECT REPORT */}
      <ReportSection
        title="Project Report"
        icon={FolderKanban}
        exportHref="/admin/reports/export?type=project"
        printHref="/admin/reports-print/project"
      >
        {project && (
          <StatRow
            items={[
              { label: "Total", value: project.total },
              { label: "Upcoming", value: project.upcoming },
              { label: "Ongoing", value: project.ongoing },
              { label: "Completed", value: project.completed },
            ]}
          />
        )}
      </ReportSection>

      {/* MARKETING REPORT */}
      <ReportSection
        title={`Marketing Report (${range.label})`}
        icon={Megaphone}
        exportHref={`/admin/reports/export?type=marketing&${rangeQuery}`}
        printHref={`/admin/reports-print/marketing?${rangeQuery}`}
      >
        {marketing.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No tracked leads yet for this period — nothing to compare.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">
              Only channels with at least one tracked lead are shown — untracked platforms aren&apos;t invented.
            </p>
            <CountBucketChart title="Leads by Source" data={marketing} />
          </>
        )}
      </ReportSection>
    </div>
  );
}

function ReportSection({
  title,
  icon: Icon,
  exportHref,
  printHref,
  children,
}: {
  title: string;
  icon: typeof Building2;
  exportHref: string;
  printHref: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Icon className="h-4.5 w-4.5 text-primary" /> {title}
        </h2>
        <div className="flex gap-2">
          <a
            href={exportHref}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <Link
            href={printHref}
            target="_blank"
            className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </Link>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatRow({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-border p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{i.label}</div>
          <div className="mt-1 font-heading text-xl font-extrabold text-ink">{i.value}</div>
        </div>
      ))}
    </div>
  );
}
