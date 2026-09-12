"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle, CheckCircle2 } from "lucide-react";
import type { FinancialTransaction } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CrmPaginationLinks } from "@/components/admin/crm/CrmPaginationLinks";
import { confirmTransactionAction, cancelTransactionAction, reverseTransactionAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export function TransactionList({ transactions, total, page, totalPages, canManage }: { transactions: FinancialTransaction[]; total: number; page: number; totalPages: number; canManage: boolean }) {
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
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

  function reverse(id: string) {
    if (!reason.trim()) {
      toast.show("Please enter a reason for the reversal.");
      return;
    }
    run(() => reverseTransactionAction(id, reason), "Transaction reversed.");
    setReversingId(null);
    setReason("");
  }

  if (transactions.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">No transactions found.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{t.transactionNumber}</td>
                <td className="px-4 py-3 text-muted">{formatDateOnly(t.transactionDate)}</td>
                <td className="px-4 py-3 text-muted">{t.transactionType}</td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">{t.description || "—"}</td>
                <td className="px-4 py-3 text-muted">{t.accountName || "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(t.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(t.status === "DRAFT" || t.status === "PENDING") && (
                        <>
                          <button type="button" onClick={() => run(() => confirmTransactionAction(t.id), "Confirmed.")} disabled={isPending} className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </button>
                          <button type="button" onClick={() => run(() => cancelTransactionAction(t.id), "Cancelled.")} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </>
                      )}
                      {t.status === "CONFIRMED" && (
                        <button type="button" onClick={() => setReversingId(reversingId === t.id ? null : t.id)} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary">
                          <RotateCcw className="h-3.5 w-3.5" /> Reverse
                        </button>
                      )}
                    </div>
                    {reversingId === t.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="w-40 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                        <button type="button" onClick={() => reverse(t.id)} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
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
      <p className="mt-3 text-xs text-muted-foreground">{total} transaction(s) total.</p>
      <CrmPaginationLinks page={page} totalPages={totalPages} />
    </div>
  );
}
