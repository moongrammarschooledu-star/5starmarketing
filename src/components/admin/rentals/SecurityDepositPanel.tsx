"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SecurityDeposit, DepositTransaction, DepositTransactionType } from "@/lib/models/rental";
import { depositTransactionTypes } from "@/lib/models/rental";
import { markDepositReceivedAction, recordDepositTransactionAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

export function SecurityDepositPanel({ deposit, transactions, canManage }: { deposit?: SecurityDeposit; transactions: DepositTransaction[]; canManage: boolean }) {
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [txType, setTxType] = useState<DepositTransactionType>("DEDUCTION");
  const [txAmount, setTxAmount] = useState("");
  const [txReason, setTxReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (!deposit) return <p className="mt-3 text-sm text-muted">No security deposit record for this lease.</p>;

  function markReceived() {
    startTransition(async () => {
      try {
        await markDepositReceivedAction(deposit!.id, receivedDate);
        toast.show("Deposit marked received.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this deposit.");
      }
    });
  }

  function recordTransaction() {
    if (!txAmount) {
      toast.show("Please enter an amount.");
      return;
    }
    if (txType === "DEDUCTION" && !txReason.trim()) {
      toast.show("A deduction requires a reason.");
      return;
    }
    startTransition(async () => {
      try {
        await recordDepositTransactionAction(deposit!.id, { transactionType: txType, amount: Number(txAmount), reason: txReason || undefined });
        toast.show("Transaction recorded.");
        setTxAmount("");
        setTxReason("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this transaction.");
      }
    });
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">Deposit Amount: {formatPKR(deposit.amount)}</p>
          {deposit.refundAmount != null && <p className="text-xs text-muted">Refunded: {formatPKR(deposit.refundAmount)}</p>}
        </div>
        <StatusBadge status={deposit.status} />
      </div>

      {canManage && deposit.status === "EXPECTED" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
          <button type="button" onClick={markReceived} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Mark Received
          </button>
        </div>
      )}

      {canManage && (deposit.status === "RECEIVED" || deposit.status === "HELD" || deposit.status === "PARTIALLY_REFUNDED") && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Record Deduction / Refund</span>
          <div className="flex flex-wrap items-center gap-2">
            <select value={txType} onChange={(e) => setTxType(e.target.value as DepositTransactionType)} className={inputClass}>
              {depositTransactionTypes.filter((t) => t !== "RECEIVED").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="Amount" className={`${inputClass} w-24`} />
            <input value={txReason} onChange={(e) => setTxReason(e.target.value)} placeholder="Reason" className={`${inputClass} w-48`} />
            <button type="button" onClick={recordTransaction} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Save
            </button>
          </div>
          <p className="text-[11px] text-muted">A deduction requires a reason and, ideally, an evidence document (attach via the lease&apos;s Documents section).</p>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs">
            <span className="text-ink">
              {t.transactionType} — {formatPKR(t.amount)} {t.reason ? `(${t.reason})` : ""}
            </span>
            <span className="text-muted">{new Date(t.transactionDate).toLocaleDateString("en-GB")}</span>
          </div>
        ))}
        {transactions.length === 0 && <p className="text-xs text-muted">No transactions recorded yet.</p>}
      </div>
    </div>
  );
}
