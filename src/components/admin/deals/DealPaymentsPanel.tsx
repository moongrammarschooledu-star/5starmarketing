"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt, Plus, ArrowRight } from "lucide-react";
import type { DealPayment, PaymentType, PaymentMethod } from "@/lib/models/deal";
import { paymentTypes, paymentMethods } from "@/lib/models/deal";
import { recordDealPaymentAction } from "@/lib/actions/deals.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DealPaymentsPanel({ dealId, payments }: { dealId: string; payments: DealPayment[] }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Installment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Bank Transfer");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    startTransition(async () => {
      try {
        await recordDealPaymentAction(dealId, { amount: value, paymentType, paymentMethod, reference: reference || undefined, paymentDate });
        setAmount("");
        setReference("");
        setShowForm(false);
        toast.show("Payment recorded.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment could not be recorded.");
      }
    });
  }

  const recent = payments.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Receipt className="h-4.5 w-4.5 text-primary" /> Payments
        </h2>
        <Link href={`/admin/deals/${dealId}/payments`} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No payments recorded.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
              <div>
                <div className="font-bold text-ink">{formatPKR(p.amount)}</div>
                <div className="text-xs text-muted">
                  {p.paymentType} · {p.paymentMethod} · {new Date(p.paymentDate).toLocaleDateString("en-GB")}
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-muted p-4">
          <div className="grid grid-cols-2 gap-2.5">
            <input type="number" min={0} placeholder="Amount (PKR)" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {paymentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Reference (receipt / cheque #)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-xs font-semibold text-primary">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Save Payment
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Add Payment
        </button>
      )}
    </div>
  );
}
