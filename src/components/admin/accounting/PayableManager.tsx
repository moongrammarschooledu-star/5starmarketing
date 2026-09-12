"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, XCircle, Banknote } from "lucide-react";
import type { Payable } from "@/lib/models/accounting";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createPayableAction, approvePayableAction, cancelPayableAction, recordPayablePaymentAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

export function PayableManager({ payables }: { payables: Payable[] }) {
  const [creating, setCreating] = useState(false);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    const amountNum = Number(amount);
    if (!vendor.trim() || !amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.show("Please enter a vendor and a valid amount.");
      return;
    }
    startTransition(async () => {
      try {
        await createPayableAction({ vendor: vendor.trim(), description: description || undefined, amount: amountNum, dueDate: dueDate || undefined });
        toast.show("Payable created.");
        setCreating(false);
        setVendor("");
        setDescription("");
        setAmount("");
        setDueDate("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this payable.");
      }
    });
  }

  function approve(id: string) {
    startTransition(async () => {
      await approvePayableAction(id);
      toast.show("Payable approved.");
      router.refresh();
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel this payable?")) return;
    startTransition(async () => {
      try {
        await cancelPayableAction(id);
        toast.show("Payable cancelled.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not cancel this payable.");
      }
    });
  }

  function pay(id: string) {
    const amountNum = Number(payAmount);
    if (!payAmount || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.show("Please enter a valid payment amount.");
      return;
    }
    startTransition(async () => {
      try {
        await recordPayablePaymentAction(id, amountNum);
        toast.show("Payment recorded.");
        setPayingId(null);
        setPayAmount("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this payment.");
      }
    });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button type="button" onClick={() => setCreating((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Payable
        </button>
      </div>

      {creating && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-border bg-surface p-4 sm:grid-cols-2">
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor / Contractor / Agent" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (PKR)" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary sm:col-span-2" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {isPending ? "Creating..." : "Create Payable"}
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payables.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No payables yet.
                </td>
              </tr>
            )}
            {payables.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{p.payableNumber}</td>
                <td className="px-4 py-3 text-muted">{p.vendor}</td>
                <td className="px-4 py-3 text-muted">{p.dueDate || "—"}</td>
                <td className="px-4 py-3 text-ink">{formatPKR(p.amount)}</td>
                <td className="px-4 py-3 text-muted">{formatPKR(p.paidAmount)}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(p.outstandingAmount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.status === "PENDING" && (
                      <button type="button" onClick={() => approve(p.id)} disabled={isPending} className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {["APPROVED", "PARTIALLY_PAID", "OVERDUE"].includes(p.status) && (
                      <button type="button" onClick={() => setPayingId(payingId === p.id ? null : p.id)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                        <Banknote className="h-3.5 w-3.5" /> Pay
                      </button>
                    )}
                    {["DRAFT", "PENDING", "APPROVED"].includes(p.status) && (
                      <button type="button" onClick={() => cancel(p.id)} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                  {payingId === p.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input type="number" min="0" step="0.01" max={p.outstandingAmount} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount" className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
                      <button type="button" onClick={() => pay(p.id)} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                        Confirm
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
