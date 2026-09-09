import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reportService } from "@/services/reportService";
import { resolveDateRange } from "@/services/analyticsService";
import { site } from "@/lib/site";
import type { DateRangeKey, CountBucket } from "@/lib/models/analytics";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Outside the /admin/(panel) layout (deliberately, for a clean printable
// page with no sidebar/topbar) so it doesn't inherit that layout's
// noindex metadata — set it explicitly here instead. This page carries
// internal business data and must never be indexable, regardless.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const TITLES: Record<string, string> = {
  property: "Property Report",
  lead: "Lead Report",
  project: "Project Report",
  marketing: "Marketing Report",
};

function generatedDate() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Table({ title, rows }: { title: string; rows: CountBucket[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold text-black">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-black/10">
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5 text-right font-semibold">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSection("reports");
  const { type } = await params;
  const sp = await searchParams;
  if (!TITLES[type]) notFound();

  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let summary: { label: string; value: number }[] = [];
  let tables: { title: string; rows: CountBucket[] }[] = [];
  const isTimeScoped = type === "lead" || type === "marketing";

  try {
    if (type === "property") {
      const r = await reportService.propertyReport();
      summary = [
        { label: "Total Properties", value: r.total },
        { label: "Available", value: r.available },
        { label: "Reserved", value: r.reserved },
        { label: "Sold", value: r.sold },
        { label: "Inactive", value: r.inactive },
      ];
      tables = [
        { title: "By Type", rows: r.byType },
        { title: "By Location", rows: r.byLocation },
        { title: "By Status", rows: r.byStatus },
      ];
    } else if (type === "lead") {
      const r = await reportService.leadReport(range);
      summary = [
        { label: "Total Leads", value: r.total },
        { label: "New", value: r.new },
        { label: "Contacted", value: r.contacted },
        { label: "Interested", value: r.interested },
        { label: "Follow-Up", value: r.followUp },
        { label: "Closed", value: r.closed },
        { label: "Lost", value: r.lost },
      ];
      tables = [
        { title: "By Source", rows: r.bySource },
        { title: "By Property", rows: r.byProperty },
        { title: "By Status", rows: r.byStatus },
      ];
    } else if (type === "project") {
      const r = await reportService.projectReport();
      summary = [
        { label: "Total Projects", value: r.total },
        { label: "Upcoming", value: r.upcoming },
        { label: "Ongoing", value: r.ongoing },
        { label: "Completed", value: r.completed },
      ];
      tables = [{ title: "By Status", rows: r.byStatus }];
    } else if (type === "marketing") {
      const rows = await reportService.marketingReport(range);
      tables = [{ title: "Leads by Source", rows }];
    }
  } catch {
    // Fall through with whatever partial data was gathered — the page
    // still renders the header/date range rather than a hard error.
  }

  return (
    <div className="mx-auto max-w-3xl bg-white px-6 py-10 text-black print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="flex items-start justify-between border-b-2 border-black/80 pb-4">
        <div>
          <div className="text-lg font-extrabold">{site.fullName}</div>
          <div className="text-xs text-black/60">{site.address}</div>
        </div>
        <PrintButton />
      </div>

      <h1 className="mt-6 text-2xl font-extrabold">{TITLES[type]}</h1>
      <div className="mt-1 text-sm text-black/70">
        {isTimeScoped && <>Date Range: {range.label} · </>}
        Generated: {generatedDate()}
      </div>

      {summary.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {summary.map((s) => (
            <div key={s.label} className="rounded border border-black/15 p-3">
              <div className="text-[11px] uppercase text-black/50">{s.label}</div>
              <div className="text-xl font-extrabold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {tables.map((t) => (
        <Table key={t.title} title={t.title} rows={t.rows} />
      ))}

      <p className="mt-10 text-[11px] text-black/40">
        Generated by the 5STAR.M Admin Dashboard. Internal use only — not for public distribution.
      </p>
    </div>
  );
}
