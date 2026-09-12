"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Banknote, RefreshCcw, XCircle } from "lucide-react";
import type { AgentCommission } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";
import { submitCommissionForApprovalAction, approveCommissionAction, recordCommissionPaymentAction, recalculateCommissionAction, cancelCommissionAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

export function CommissionList({ commissions, total, page, totalPages, canManage }: { commissions: AgentCommission[]; total: number; page: number; totalPages: number; canManage: boolean }) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [recalcId, setRecalcId] = useState<string | null>(null);
  const [recalcAmount, setRecalcAmount] = useState("");
  const [recalcReason, setRecalcReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.show(successMessage);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  function pay(id: string) {
    const amount = Number(payAmount);
    if (!payAmount || !Number.isFinite(amount) || amount <= 0) {
      toast.show("Please enter a valid amount.");
      return;
    }
    run(() => recordCommissionPaymentAction(id, amount), "Payment recorded.");
    setPayingId(null);
    setPayAmount("");
  }

  function recalc(id: string) {
    const amount = Number(recalcAmount);
    if (!recalcAmount || !Number.isFinite(amount) || amount < 0 || !recalcReason.trim()) {
      toast.show("Please enter a valid amount and a reason.");
      return;
    }
    run(() => recalculateCommissionAction(id, amount, recalcReason), "Commission recalculated.");
    setRecalcId(null);
    setRecalcAmount("");
    setRecalcReason("");
  }

  if (commissions.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No commissions yet.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Basis</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{c.commissionNumber}</td>
                <td className="px-4 py-3 text-muted">{c.agentName || "—"}</td>
                <td className="px-4 py-3 text-muted">{c.dealNumber || "—"}</td>
                <td className="px-4 py-3 text-muted">
                  {c.basis.replace(/_/g, " ")}
                  {c.commissionRate != null && ` (${c.commissionRate}%)`}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(c.commissionAmount)}</td>
                <td className="px-4 py-3 text-muted">{formatPKR(c.paidAmount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.status === "CALCULATED" && (
                        <button type="button" onClick={() => run(() => submitCommissionForApprovalAction(c.id), "Submitted.")} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary disabled:opacity-50">
                          <Send className="h-3.5 w-3.5" /> Submit
                        </button>
                      )}
                      {(c.status === "CALCULATED" || c.status === "PENDING_APPROVAL") && (
                        <>
                          <button type="button" onClick={() => run(() => approveCommissionAction(c.id), "Commission approved.")} disabled={isPending} className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt("Reason for cancelling this commission:");
                              if (reason) run(() => cancelCommissionAction(c.id, reason), "Commission cancelled.");
                            }}
                            disabled={isPending}
                            className="flex items-center gap-1 rounded-full border-2 border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </>
                      )}
                      {(c.status === "APPROVED" || c.status === "PARTIALLY_PAID") && (
                        <button type="button" onClick={() => setPayingId(payingId === c.id ? null : c.id)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                          <Banknote className="h-3.5 w-3.5" /> Pay
                        </button>
                      )}
                      {c.status !== "PAID" && c.status !== "CANCELLED" && (
                        <button type="button" onClick={() => setRecalcId(recalcId === c.id ? null : c.id)} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary">
                          <RefreshCcw className="h-3.5 w-3.5" /> Recalculate
                        </button>
                      )}
                    </div>
                    {payingId === c.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount" className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                        <button type="button" onClick={() => pay(c.id)} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                          Confirm
                        </button>
                      </div>
                    )}
                    {recalcId === c.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="number" min="0" step="0.01" value={recalcAmount} onChange={(e) => setRecalcAmount(e.target.value)} placeholder="New amount" className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                        <input type="text" value={recalcReason} onChange={(e) => setRecalcReason(e.target.value)} placeholder="Reason" className="w-40 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                        <button type="button" onClick={() => recalc(c.id)} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                          Confirm
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{total} commission(s) total.</p>
      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
