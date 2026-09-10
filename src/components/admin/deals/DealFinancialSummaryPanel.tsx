"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Pencil } from "lucide-react";
import type { Deal } from "@/lib/models/deal";
import { bookingStatuses } from "@/lib/models/deal";
import { updateDealFinancialsAction } from "@/lib/actions/deals.actions";
import { formatPKR } from "@/lib/calculator";
import { useToast } from "@/components/admin/ToastProvider";

export function DealFinancialSummaryPanel({ deal, canEdit }: { deal: Deal; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState(String(deal.negotiatedPrice));
  const [discountAmount, setDiscountAmount] = useState(String(deal.discountAmount));
  const [discountReason, setDiscountReason] = useState(deal.discountReason ?? "");
  const [bookingAmount, setBookingAmount] = useState(String(deal.bookingAmount));
  const [bookingDate, setBookingDate] = useState(deal.bookingDate ?? "");
  const [bookingStatus, setBookingStatus] = useState(deal.bookingStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateDealFinancialsAction(deal.id, {
          negotiatedPrice: Number(negotiatedPrice),
          discountAmount: Number(discountAmount),
          discountReason: discountReason || undefined,
          bookingAmount: Number(bookingAmount),
          bookingDate: bookingDate || undefined,
          bookingStatus,
        });
        setEditing(false);
        toast.show("Financial details updated.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save these changes.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
          <Wallet className="h-4.5 w-4.5 text-primary" /> Financial Summary
        </h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deal.propertyPrice !== undefined && <Row label="Property Price" value={formatPKR(deal.propertyPrice)} />}
          <Row label="Negotiated Price" value={formatPKR(deal.negotiatedPrice)} />
          <Row label="Discount" value={deal.discountAmount > 0 ? `- ${formatPKR(deal.discountAmount)}` : formatPKR(0)} />
          <Row label="Final Deal Amount" value={formatPKR(deal.finalAmount)} highlight />
          <Row label="Booking Amount" value={formatPKR(deal.bookingAmount)} />
          <Row label="Booking Status" value={deal.bookingStatus} />
          <Row label="Received Amount" value={formatPKR(deal.receivedAmount)} highlight="success" />
          <Row label="Outstanding" value={formatPKR(deal.outstandingAmount)} highlight={deal.outstandingAmount > 0 ? "primary" : "success"} />
          {deal.discountReason && <Row label="Discount Reason" value={deal.discountReason} />}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Negotiated Price (PKR)" type="number" value={negotiatedPrice} onChange={setNegotiatedPrice} />
            <Field label="Discount Amount (PKR)" type="number" value={discountAmount} onChange={setDiscountAmount} />
            <Field label="Discount Reason" value={discountReason} onChange={setDiscountReason} className="sm:col-span-2" />
            <Field label="Booking Amount (PKR)" type="number" value={bookingAmount} onChange={setBookingAmount} />
            <Field label="Booking Date" type="date" value={bookingDate} onChange={setBookingDate} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Booking Status</span>
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value as typeof bookingStatus)}
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              >
                {bookingStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-xs font-semibold text-primary">{error}</p>}
          <div className="flex gap-2.5">
            <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              Save Changes
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-full border-2 border-ink/15 px-5 py-2 text-xs font-bold text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean | "success" | "primary" }) {
  const color = highlight === "success" ? "text-success" : highlight === "primary" ? "text-primary" : highlight ? "text-ink" : "text-ink";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-right font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ""}`}>
      <span className="font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={type === "number" ? 0 : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}
