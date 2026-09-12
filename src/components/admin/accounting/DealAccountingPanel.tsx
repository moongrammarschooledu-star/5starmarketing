import Link from "next/link";
import { Wallet } from "lucide-react";
import { accountingReportService } from "@/services/accountingReportService";
import { agentCommissionService } from "@/services/agentCommissionService";
import { expenseService } from "@/services/expenseService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

/** Deal Financial Tab (STEP 23, section 50) — sits alongside the
 *  existing STEP 18 DealFinancialSummaryPanel/DealCommissionPanel
 *  (Deal Value/Received/Outstanding, and the original per-deal
 *  commission override) rather than replacing them; this adds what
 *  STEP 18 never had: allocated expenses, a real profit figure, and
 *  the STEP 23 rules-based commission record for this deal, if one
 *  has been calculated. */
export async function DealAccountingPanel({ dealId }: { dealId: string }) {
  const [profitability, commission, { expenses }] = await Promise.all([
    accountingReportService.dealProfitability(dealId).catch(() => undefined),
    agentCommissionService.getByDeal(dealId),
    expenseService.search({ dealId, page: 1, pageSize: 50 }),
  ]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Wallet className="h-4.5 w-4.5 text-primary" /> Accounting
      </h2>

      {profitability && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Revenue (Received)" value={formatPKR(profitability.revenue)} />
          <Stat label="Allocated Expenses" value={formatPKR(profitability.allocatedExpenses)} />
          <Stat label="Commission" value={formatPKR(profitability.commission)} />
          <Stat label="Net Profit" value={formatPKR(profitability.netProfit)} accent />
        </div>
      )}
      {profitability?.isEstimate && <p className="mt-2 text-xs text-muted">Estimated — this deal has not yet reached Completed status.</p>}

      {expenses.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Allocated Expenses</p>
          <div className="mt-2 space-y-1.5">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/accounting/expenses/${e.id}`} className="text-ink hover:text-primary hover:underline">
                  {e.expenseNumber} — {e.description}
                </Link>
                <span className="font-semibold text-ink">{formatPKR(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Commission (Rules Engine)</p>
        {commission ? (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink">
              {commission.commissionNumber} — {commission.basis.replace(/_/g, " ")}
              {commission.commissionRate != null && ` (${commission.commissionRate}%)`}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{formatPKR(commission.commissionAmount)}</span>
              <StatusBadge status={commission.status} />
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">Not yet calculated.</p>
        )}
        <Link href="/admin/accounting/commissions" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
          Manage in Accounting →
        </Link>
      </div>

      <Link href={`/admin/accounting/expenses/new`} className="mt-4 inline-block text-xs font-bold text-primary hover:underline">
        + Record an expense for this deal →
      </Link>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading text-sm font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
