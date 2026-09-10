"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, MessageCircle, Download, AlertCircle, Info } from "lucide-react";
import {
  calculatePaymentPlan,
  validatePaymentInput,
  formatPKR,
  PAYMENT_DISCLAIMER,
  type PaymentCalculationInput,
} from "@/lib/calculator";
import { installmentFrequencies, type InstallmentFrequency, type PaymentScheduleItem } from "@/lib/models/paymentPlan";
import { whatsappLink } from "@/lib/site";
import { PaymentScheduleTable } from "./PaymentScheduleTable";

export function PaymentCalculator({
  propertyName,
  propertyLocation,
  initialPrice,
  initialDownPayment,
  initialDuration,
  initialFrequency,
  isCustomSchedule,
  scheduleItems,
}: {
  propertyName?: string;
  propertyLocation?: string;
  initialPrice?: number;
  initialDownPayment?: number;
  initialDuration?: number;
  initialFrequency?: InstallmentFrequency;
  isCustomSchedule?: boolean;
  scheduleItems?: PaymentScheduleItem[];
}) {
  const [price, setPrice] = useState(initialPrice ?? 5000000);
  const [downPayment, setDownPayment] = useState(initialDownPayment ?? 0);
  const [duration, setDuration] = useState(initialDuration ?? 12);
  const [frequency, setFrequency] = useState<InstallmentFrequency>(initialFrequency ?? "Monthly");

  const input: PaymentCalculationInput = useMemo(
    () => ({ propertyPrice: price, downPayment, duration, frequency }),
    [price, downPayment, duration, frequency]
  );
  const error = useMemo(() => validatePaymentInput(input), [input]);
  const result = useMemo(() => (error ? null : calculatePaymentPlan(input)), [input, error]);

  const waMessage = result
    ? `Assalam-o-Alaikum 5STAR.M Estate & Builders,\n\nI am interested in:\n\n${propertyName ? `Property: ${propertyName}\n\n` : ""}Price: ${formatPKR(price)}\nDown Payment: ${formatPKR(downPayment)}\nEstimated Installment: ${formatPKR(result.installmentAmount)} (${frequency})\nDuration: ${duration} ${frequency === "Monthly" ? "months" : frequency === "Quarterly" ? "quarters" : "years"}\n\nPlease confirm the actual payment plan and complete details.\n\nThank you.`
    : "";

  const printParams = new URLSearchParams({
    property: propertyName ?? "",
    location: propertyLocation ?? "",
    price: String(price),
    downPayment: String(downPayment),
    installment: result ? String(result.installmentAmount) : "",
    duration: String(duration),
    frequency,
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Calculator className="h-4.5 w-4.5 text-primary" /> Payment Calculator
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Property Price (Rs.)</span>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Down Payment (Rs.)</span>
          <input
            type="number"
            min={0}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Payment Frequency</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          >
            {installmentFrequencies.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">
            Payment Duration ({frequency === "Monthly" ? "months" : frequency === "Quarterly" ? "quarters" : "years"})
          </span>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary" role="alert">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultTile label="Remaining Amount" value={formatPKR(result.remainingAmount)} />
            <ResultTile label="Estimated Installment" value={formatPKR(result.installmentAmount)} highlight />
            <ResultTile label="Total Payments" value={String(result.totalPayments)} />
            <ResultTile label="Total Payment" value={formatPKR(result.totalPayment)} />
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {PAYMENT_DISCLAIMER}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" /> Discuss This Payment Plan on WhatsApp
            </a>
            <Link
              href={`/payment-plan-print?${printParams.toString()}`}
              target="_blank"
              className="flex items-center gap-2 rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Download Payment Plan
            </Link>
          </div>
        </>
      )}

      {isCustomSchedule && scheduleItems && scheduleItems.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <PaymentScheduleTable items={scheduleItems} />
        </div>
      )}
    </div>
  );
}

function ResultTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-heading text-base font-extrabold ${highlight ? "text-primary" : "text-ink"}`}>{value}</div>
    </div>
  );
}
