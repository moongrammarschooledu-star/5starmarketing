import Link from "next/link";
import { accountingReportService } from "@/services/accountingReportService";
import { payableService } from "@/services/payableService";
import { financialTransactionService } from "@/services/financialTransactionService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AccountingDashboardPage() {
  await requireSection("accounting");
  await payableService.markOverdue().catch(() => {});
  const [stats, recent] = await Promise.all([accountingReportService.dashboardStats(), financialTransactionService.search({ page: 1, pageSize: 10 })]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Financial Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Every figure below comes from real, confirmed records — nothing here is estimated or fabricated.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total Revenue" value={formatPKR(stats.totalRevenue)} />
        <Stat label="Collected Revenue" value={formatPKR(stats.collectedRevenue)} />
        <Stat label="Outstanding Receivables" value={formatPKR(stats.outstandingReceivables)} accent={stats.outstandingReceivables > 0} />
        <Stat label="Total Expenses" value={formatPKR(stats.totalExpenses)} />
        <Stat label="Agent Commissions" value={formatPKR(stats.agentCommissions)} />
        <Stat label="Gross Profit" value={formatPKR(stats.grossProfit)} />
        <Stat label="Net Profit" value={formatPKR(stats.netProfit)} accent={stats.netProfit < 0} />
        <Stat label="Cash Inflow" value={formatPKR(stats.cashInflow)} />
        <Stat label="Cash Outflow" value={formatPKR(stats.cashOutflow)} />
        <Stat label="Net Cash Flow" value={formatPKR(stats.netCashFlow)} accent={stats.netCashFlow < 0} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Today's Collection" value={formatPKR(stats.todaysCollection)} small />
        <Stat label="This Month Revenue" value={formatPKR(stats.thisMonthRevenue)} small />
        <Stat label="This Month Expenses" value={formatPKR(stats.thisMonthExpenses)} small />
        <Stat label="Overdue Receivables" value={`${stats.overdueReceivablesCount} (${formatPKR(stats.overdueReceivablesAmount)})`} small accent={stats.overdueReceivablesCount > 0} />
        <Stat label="Pending Commissions" value={`${stats.pendingCommissionsCount} (${formatPKR(stats.pendingCommissionsAmount)})`} small />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Best Performing Property" value={stats.bestPerformingPropertyTitle || "—"} small />
        <Stat label="Best Performing Project" value={stats.bestPerformingProjectName || "—"} small />
        <Stat label="Top Agent" value={stats.topAgentName || "—"} small />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Overdue Receivables</h2>
          <Link href="/admin/accounting/receivables?status=OVERDUE" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
            View all overdue receivables →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-heading text-sm font-bold text-ink">Pending Commissions</h2>
          <Link href="/admin/accounting/commissions?status=PENDING_APPROVAL" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
            View pending commissions →
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-bold text-ink">Recent Transactions</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {recent.transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{t.transactionNumber}</td>
                  <td className="px-4 py-3 text-muted">{formatDateOnly(t.transactionDate)}</td>
                  <td className="px-4 py-3 text-muted">{t.transactionType}</td>
                  <td className="px-4 py-3 text-ink">{formatPKR(t.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/admin/accounting/transactions" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
          View all transactions →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading ${small ? "text-base" : "text-xl"} font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
