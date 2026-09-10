import Link from "next/link";
import { AlertTriangle, Printer, Wallet, TrendingUp, PiggyBank, CheckCircle2, XCircle } from "lucide-react";
import { dealReportsService } from "@/services/dealReportsService";
import { resolveDateRange } from "@/services/analyticsService";
import { StatCard } from "@/components/admin/StatCard";
import { AnalyticsTimeFilter } from "@/components/admin/AnalyticsTimeFilter";
import { formatPKR } from "@/lib/calculator";
import type { DateRangeKey } from "@/lib/models/analytics";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealsReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireSection("deals");
  const sp = await searchParams;
  const rangeKey = (sp.range as DateRangeKey) || "30d";
  const range = resolveDateRange(rangeKey, { from: sp.from, to: sp.to });

  let summary: Awaited<ReturnType<typeof dealReportsService.summary>> | null = null;
  let loadError: string | null = null;
  try {
    summary = await dealReportsService.summary(range);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load sales reports.";
  }

  const printQuery = `range=${range.key}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Sales Reports</h1>
          <p className="mt-1 text-sm text-muted">Real transaction data — nothing here is estimated.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnalyticsTimeFilter current={rangeKey} lastUpdated={new Date().toLocaleTimeString("en-GB")} />
          <Link href={`/admin/deal-report-print?${printQuery}`} target="_blank" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <Printer className="h-3.5 w-3.5" /> Print
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {summary && (
        <>
          {!summary.hasEnoughData && summary.totalDeals > 0 && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> Not enough deals in this range for a reliable breakdown — counts below are still real.
            </div>
          )}
          {summary.totalDeals === 0 && <p className="mt-6 text-sm text-muted">No deals in this date range.</p>}

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total Deals" value={summary.totalDeals} icon={Wallet} />
            <StatCard label="Completed" value={summary.completedDeals} icon={CheckCircle2} tone="success" />
            <StatCard label="Cancelled" value={summary.cancelledDeals} icon={XCircle} />
            <StatCard label="Total Deal Value" value={formatPKR(summary.totalDealValue)} icon={TrendingUp} tone="primary" />
            <StatCard label="Outstanding" value={formatPKR(summary.totalOutstanding)} icon={PiggyBank} />
          </div>

          <ReportTable
            title="Sales by Month"
            columns={["Month", "Deals", "Deal Value", "Received", "Outstanding", "Completed"]}
            rows={summary.byMonth.map((r) => [r.month, r.deals, formatPKR(r.dealValue), formatPKR(r.received), formatPKR(r.outstanding), r.completed])}
          />
          <ReportTable
            title="Sales by Agent"
            columns={["Agent", "Deals", "Completed", "Deal Value", "Commission Earned", "Commission Paid"]}
            rows={summary.byAgent.map((r) => [r.agentName, r.deals, r.completed, formatPKR(r.dealValue), formatPKR(r.commissionEarned), formatPKR(r.commissionPaid)])}
          />
          <ReportTable
            title="Sales by Property"
            columns={["Property", "Deals", "Deal Value", "Received", "Outstanding", "Completed"]}
            rows={summary.byProperty.map((r) => [r.propertyTitle, r.deals, formatPKR(r.dealValue), formatPKR(r.received), formatPKR(r.outstanding), r.completed])}
          />
          <ReportTable
            title="Sales by Project"
            columns={["Project", "Bookings", "Deal Value", "Received", "Outstanding", "Completed"]}
            rows={summary.byProject.map((r) => [r.projectName, r.bookings, formatPKR(r.dealValue), formatPKR(r.received), formatPKR(r.outstanding), r.completed])}
          />
          <ReportTable title="Sales by Deal Type" columns={["Deal Type", "Deals", "Deal Value", "Completed"]} rows={summary.byDealType.map((r) => [r.dealType, r.deals, formatPKR(r.dealValue), r.completed])} />
          <ReportTable title="Commission Summary" columns={["Status", "Deals", "Amount"]} rows={summary.commissionSummary.map((r) => [r.commissionStatus, r.deals, formatPKR(r.amount)])} />
        </>
      )}
    </div>
  );
}

function ReportTable({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No data in this date range.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-3 py-2.5 ${j === 0 ? "font-semibold text-ink" : "text-muted"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
