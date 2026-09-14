"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
import type { RentSchedule, RentPayment, RentPaymentMethod } from "@/lib/models/rental";
import { rentPaymentMethods } from "@/lib/models/rental";
import {
  generateRentScheduleAction,
  applyLateFeeAction,
  waiveRentScheduleAction,
  cancelRentScheduleAction,
  createRentPaymentAction,
  confirmRentPaymentAction,
  markRentPaymentFailedAction,
  reverseRentPaymentAction,
} from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary";

export function RentScheduleManager({ leaseId, schedules, payments, canManage }: { leaseId: string; schedules: RentSchedule[]; payments: RentPayment[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      try {
        await generateRentScheduleAction(leaseId, 12);
        toast.show("Rent schedule generated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate the rent schedule.");
      }
    });
  }

  return (
    <div className="mt-3">
      {canManage && (
        <button type="button" onClick={generate} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Generate Rent Schedule (12 periods)
        </button>
      )}

      <div className="mt-4 space-y-2">
        {schedules.map((s) => (
          <ScheduleRow key={s.id} leaseId={leaseId} schedule={s} canManage={canManage} />
        ))}
        {schedules.length === 0 && <p className="text-sm text-muted">No rent periods generated yet.</p>}
      </div>

      <h3 className="mt-6 font-heading text-base font-bold text-ink">Payment History</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">Payment #</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Method</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} canManage={canManage} />
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleRow({ leaseId, schedule, canManage }: { leaseId: string; schedule: RentSchedule; canManage: boolean }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState((schedule.outstanding ?? schedule.totalDue).toString());
  const [method, setMethod] = useState<RentPaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const overdue = schedule.status === "OVERDUE";

  function recordPayment() {
    if (!amount) return;
    startTransition(async () => {
      try {
        await createRentPaymentAction({ leaseId, rentScheduleId: schedule.id, amount: Number(amount), paymentMethod: method, referenceNumber: reference || undefined });
        toast.show("Payment recorded (pending confirmation).");
        setShowPaymentForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this payment.");
      }
    });
  }

  function applyLateFee() {
    startTransition(async () => {
      try {
        await applyLateFeeAction(schedule.id);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not apply a late fee.");
      }
    });
  }

  function waive() {
    startTransition(async () => {
      await waiveRentScheduleAction(schedule.id);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelRentScheduleAction(schedule.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {schedule.invoiceNumber} {overdue && (
              <span title="Overdue">
                <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {new Date(schedule.periodStart).toLocaleDateString("en-GB")} – {new Date(schedule.periodEnd).toLocaleDateString("en-GB")} · Due {new Date(schedule.dueDate).toLocaleDateString("en-GB")}
          </p>
        </div>
        <StatusBadge status={schedule.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-5">
        <span>Rent: {formatPKR(schedule.rentAmount)}</span>
        <span>Charges: {formatPKR(schedule.additionalCharges)}</span>
        <span>Late Fee: {formatPKR(schedule.lateFeeAmount)}</span>
        <span>Total Due: {formatPKR(schedule.totalDue)}</span>
        <span className="font-semibold text-ink">Outstanding: {formatPKR(schedule.outstanding ?? schedule.totalDue)}</span>
      </div>
      {canManage && !["PAID", "WAIVED", "CANCELLED"].includes(schedule.status) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button type="button" onClick={() => setShowPaymentForm((v) => !v)} className="text-xs font-bold text-primary hover:underline">
            Record Payment
          </button>
          {overdue && (
            <button type="button" onClick={applyLateFee} disabled={isPending} className="text-xs font-bold text-primary hover:underline">
              Apply Late Fee
            </button>
          )}
          <button type="button" onClick={waive} disabled={isPending} className="text-xs font-bold text-muted hover:text-primary">
            Waive
          </button>
          <button type="button" onClick={cancel} disabled={isPending} className="text-xs font-bold text-muted hover:text-primary">
            Cancel
          </button>
        </div>
      )}
      {showPaymentForm && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} w-24`} />
          <select value={method} onChange={(e) => setMethod(e.target.value as RentPaymentMethod)} className={inputClass}>
            {rentPaymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" className={`${inputClass} w-32`} />
          <button type="button" onClick={recordPayment} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment, canManage }: { payment: RentPayment; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function confirm() {
    startTransition(async () => {
      try {
        await confirmRentPaymentAction(payment.id);
        toast.show("Payment confirmed and posted to accounting.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not confirm this payment.");
      }
    });
  }

  function markFailed() {
    startTransition(async () => {
      await markRentPaymentFailedAction(payment.id);
      router.refresh();
    });
  }

  function reverse() {
    const reason = window.prompt("Reason for reversing this payment?");
    if (!reason) return;
    startTransition(async () => {
      try {
        await reverseRentPaymentAction(payment.id, reason);
        toast.show("Payment reversed.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not reverse this payment.");
      }
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2.5 text-ink">{payment.paymentNumber}</td>
      <td className="px-3 py-2.5 text-muted">{new Date(payment.paymentDate).toLocaleDateString("en-GB")}</td>
      <td className="px-3 py-2.5 font-semibold text-ink">{formatPKR(payment.amount)}</td>
      <td className="px-3 py-2.5 text-muted">{payment.paymentMethod}</td>
      <td className="px-3 py-2.5">
        <StatusBadge status={payment.status} />
      </td>
      <td className="px-3 py-2.5">
        {canManage && payment.status === "PENDING" && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={confirm} disabled={isPending} className="text-xs font-bold text-primary hover:underline">
              Confirm
            </button>
            <button type="button" onClick={markFailed} disabled={isPending} className="text-xs font-bold text-muted hover:text-primary">
              Failed
            </button>
          </div>
        )}
        {canManage && payment.status === "CONFIRMED" && (
          <button type="button" onClick={reverse} disabled={isPending} className="text-xs font-bold text-muted hover:text-primary">
            Reverse
          </button>
        )}
      </td>
    </tr>
  );
}
