"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw, Printer } from "lucide-react";
import type { Deal, DealPayment } from "@/lib/models/deal";
import { verifyDealPaymentAction, rejectDealPaymentAction, refundDealPaymentAction } from "@/lib/actions/deals.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/admin/Modal";

export function DealPaymentsFullTable({ deal, payments, canVerify }: { deal: Deal; payments: DealPayment[]; canVerify: boolean }) {
  const [refundTarget, setRefundTarget] = useState<DealPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function verify(paymentId: string) {
    startTransition(async () => {
      await verifyDealPaymentAction(paymentId, deal.id);
      toast.show("Payment verified.");
      router.refresh();
    });
  }

  function reject(paymentId: string) {
    startTransition(async () => {
      await rejectDealPaymentAction(paymentId, deal.id);
      toast.show("Payment rejected.");
      router.refresh();
    });
  }

  function submitRefund() {
    if (!refundTarget) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount > refundTarget.amount) {
      setError("Enter a valid refund amount, no greater than the original payment.");
      return;
    }
    setError(null);
    const payment = refundTarget;
    setRefundTarget(null);
    startTransition(async () => {
      try {
        await refundDealPaymentAction(payment.id, deal.id, { amount, reason: refundReason || undefined });
        setRefundAmount("");
        setRefundReason("");
        toast.show("Refund recorded.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this refund.");
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Recorded By</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-muted">
                No payments recorded.
              </td>
            </tr>
          )}
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-muted">{new Date(p.paymentDate).toLocaleDateString("en-GB")}</td>
              <td className="px-4 py-3 font-bold text-ink">{formatPKR(p.amount)}</td>
              <td className="px-4 py-3 text-muted">{p.paymentType}</td>
              <td className="px-4 py-3 text-muted">{p.paymentMethod}</td>
              <td className="px-4 py-3 text-muted">{p.reference ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted">{p.recordedByName ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <Link href={`/admin/deal-receipt-print/${p.id}`} target="_blank" title="Print Receipt" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary">
                    <Printer className="h-4 w-4" />
                  </Link>
                  {canVerify && p.status === "Received" && (
                    <>
                      <button type="button" onClick={() => verify(p.id)} disabled={isPending} title="Verify" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-success hover:border-success">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => reject(p.id)} disabled={isPending} title="Reject" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary hover:border-primary">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {canVerify && p.status === "Verified" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefundTarget(p);
                        setRefundAmount(String(p.amount));
                      }}
                      title="Refund"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!refundTarget} onClose={() => setRefundTarget(null)} title="Refund Payment">
        <p className="text-sm text-muted">
          Refunding against {refundTarget && formatPKR(refundTarget.amount)} paid on {refundTarget && new Date(refundTarget.paymentDate).toLocaleDateString("en-GB")}. The original payment record is
          kept — this creates a linked reversal.
        </p>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Refund Amount (PKR)</span>
            <input type="number" min={0} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Reason</span>
            <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setRefundTarget(null)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={submitRefund} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Confirm Refund
          </button>
        </div>
      </Modal>
    </div>
  );
}
