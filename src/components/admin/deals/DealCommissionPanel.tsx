"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, CheckCircle2 } from "lucide-react";
import type { Deal } from "@/lib/models/deal";
import { updateDealCommissionAction, approveDealCommissionAction, markDealCommissionPaidAction } from "@/lib/actions/deals.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function DealCommissionPanel({ deal, canManage }: { deal: Deal; canManage: boolean }) {
  const [rate, setRate] = useState(deal.commissionRate?.toString() ?? "");
  const [amount, setAmount] = useState(deal.commissionAmount?.toString() ?? "");
  const [overrideReason, setOverrideReason] = useState(deal.commissionOverrideReason ?? "");
  const [payAmount, setPayAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const computedFromRate = rate ? Math.round(((deal.finalAmount * Number(rate)) / 100) * 100) / 100 : undefined;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateDealCommissionAction(deal.id, {
          commissionRate: rate ? Number(rate) : undefined,
          commissionAmount: amount ? Number(amount) : undefined,
          commissionOverrideReason: overrideReason || undefined,
        });
        toast.show("Commission updated.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update commission.");
      }
    });
  }

  function approve() {
    startTransition(async () => {
      await approveDealCommissionAction(deal.id);
      toast.show("Commission approved.");
      router.refresh();
    });
  }

  function recordPayment() {
    const value = Number(payAmount);
    if (!value || value <= 0) {
      setError("Enter a valid commission payment amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await markDealCommissionPaidAction(deal.id, value);
        setPayAmount("");
        toast.show("Commission payment recorded.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not record this commission payment.");
      }
    });
  }

  if (!canManage && !deal.commissionAmount) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <BadgeDollarSign className="h-4.5 w-4.5 text-primary" /> Commission
        </h2>
        <StatusBadge status={deal.commissionStatus} />
      </div>

      {canManage ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Commission Rate (%)</span>
              <input type="number" min={0} step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Commission Amount (PKR)</span>
              <input
                type="number"
                min={0}
                value={amount}
                placeholder={computedFromRate !== undefined ? formatPKR(computedFromRate) : undefined}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
          {computedFromRate !== undefined && !amount && <p className="text-xs text-muted">Suggested from rate: {formatPKR(computedFromRate)} (deal amount × rate).</p>}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Override Reason (if amount differs from the rate calculation)</span>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Save Commission
          </button>

          {deal.commissionAmount !== undefined && (
            <div className="border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Row label="Commission Amount" value={formatPKR(deal.commissionAmount)} />
                <Row label="Paid So Far" value={formatPKR(deal.commissionPaidAmount)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {deal.commissionStatus === "Pending" && (
                  <button type="button" onClick={approve} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                <input
                  type="number"
                  min={0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount paid"
                  className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary"
                />
                <button type="button" onClick={recordPayment} disabled={isPending} className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  Record Commission Payment
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-xs font-semibold text-primary">{error}</p>}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {deal.commissionAmount !== undefined && <Row label="Commission Amount" value={formatPKR(deal.commissionAmount)} />}
          <Row label="Paid So Far" value={formatPKR(deal.commissionPaidAmount)} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-heading text-sm font-extrabold text-ink">{value}</div>
    </div>
  );
}
