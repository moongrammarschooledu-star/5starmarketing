import type { Metadata } from "next";
import { dealReportsService } from "@/services/dealReportsService";
import { resolveDateRange } from "@/services/analyticsService";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import type { DateRangeKey } from "@/lib/models/analytics";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function generatedDate() {
  return new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DealReportPrintPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireSection("deals");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });
  const summary = await dealReportsService.summary(range);

  return (
    <div className="mx-auto max-w-3xl bg-white px-6 py-10 text-black print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="flex items-start justify-between border-b-2 border-black/80 pb-4">
        <div>
          <div className="text-lg font-extrabold">{site.fullName}</div>
          <div className="text-xs uppercase tracking-wide text-black/60">Estate &amp; Builders</div>
        </div>
        <PrintButton />
      </div>

      <h1 className="mt-6 text-2xl font-extrabold">Sales Report</h1>
      <div className="mt-1 text-sm text-black/70">
        {range.label} — Generated: {generatedDate()}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <tbody>
          <Row label="Total Deals" value={String(summary.totalDeals)} />
          <Row label="Completed" value={String(summary.completedDeals)} />
          <Row label="Cancelled" value={String(summary.cancelledDeals)} />
          <Row label="Total Deal Value" value={formatPKR(summary.totalDealValue)} />
          <Row label="Total Received" value={formatPKR(summary.totalReceived)} />
          <Row label="Outstanding" value={formatPKR(summary.totalOutstanding)} />
        </tbody>
      </table>

      <Section title="By Month" columns={["Month", "Deals", "Deal Value", "Received", "Outstanding"]} rows={summary.byMonth.map((r) => [r.month, r.deals, formatPKR(r.dealValue), formatPKR(r.received), formatPKR(r.outstanding)])} />
      <Section title="By Agent" columns={["Agent", "Deals", "Deal Value", "Commission Earned"]} rows={summary.byAgent.map((r) => [r.agentName, r.deals, formatPKR(r.dealValue), formatPKR(r.commissionEarned)])} />
      <Section title="By Deal Type" columns={["Type", "Deals", "Deal Value"]} rows={summary.byDealType.map((r) => [r.dealType, r.deals, formatPKR(r.dealValue)])} />

      <p className="mt-10 text-[11px] text-black/40">
        {site.fullName} — {site.phoneDisplay} — {site.email}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-black/10">
      <td className="py-1.5 text-black/60">{label}</td>
      <td className="py-1.5 text-right font-semibold">{value}</td>
    </tr>
  );
}

function Section({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold text-black">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/30 text-left text-xs uppercase text-black/50">
            {columns.map((c) => (
              <th key={c} className="py-1.5">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black/10">
              {row.map((cell, j) => (
                <td key={j} className={`py-1.5 ${j > 0 ? "text-right" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
