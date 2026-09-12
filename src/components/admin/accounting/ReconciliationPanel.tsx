"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { ReconciliationRecord } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { recordReconciliationAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export function ReconciliationPanel({
  unreconciled,
  records,
}: {
  unreconciled: { id: string; transactionNumber: string; amount: number; transactionDate: string; description?: string }[];
  records: ReconciliationRecord[];
}) {
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function mark(transactionId: string, status: "MATCHED" | "IGNORED" | "ADJUSTMENT_REQUIRED", amount: number) {
    startTransition(async () => {
      try {
        await recordReconciliationAction(transactionId, status, { statementReference: refs[transactionId], matchedAmount: status === "MATCHED" ? amount : undefined });
        toast.show(`Marked ${status.replace(/_/g, " ").toLowerCase()}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this reconciliation.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-base font-bold text-ink">Unreconciled Transactions</h2>
        <p className="mt-1 text-xs text-muted">Nothing here is ever auto-marked reconciled — every match is an explicit action.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Statement Ref.</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {unreconciled.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Everything is reconciled.
                  </td>
                </tr>
              )}
              {unreconciled.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{t.transactionNumber}</td>
                  <td className="px-4 py-3 text-muted">{formatDateOnly(t.transactionDate)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{t.description || "—"}</td>
                  <td className="px-4 py-3 text-ink">{formatPKR(t.amount)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={refs[t.id] ?? ""}
                      onChange={(e) => setRefs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Bank ref."
                      className="w-32 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => mark(t.id, "MATCHED", t.amount)} disabled={isPending} className="flex items-center gap-1 rounded-full bg-success px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Match
                      </button>
                      <button type="button" onClick={() => mark(t.id, "ADJUSTMENT_REQUIRED", t.amount)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-amber-500/40 px-2.5 py-1.5 text-xs font-bold text-amber-600 disabled:opacity-50">
                        <HelpCircle className="h-3.5 w-3.5" /> Needs Adjustment
                      </button>
                      <button type="button" onClick={() => mark(t.id, "IGNORED", t.amount)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-2.5 py-1.5 text-xs font-bold text-ink disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" /> Ignore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-heading text-base font-bold text-ink">Reconciliation History</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Statement Ref.</th>
                <th className="px-4 py-3">Reconciled By</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No reconciliation history yet.
                  </td>
                </tr>
              )}
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{r.transactionNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.reconciliationStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted">{r.statementReference || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.reconciledByName || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.reconciledAt ? new Date(r.reconciledAt).toLocaleString("en-GB") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
