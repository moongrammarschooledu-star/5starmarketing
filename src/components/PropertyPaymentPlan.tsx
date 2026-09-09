import { Wallet, Info } from "lucide-react";
import type { PropertyPaymentPlan as PaymentPlanType, PaymentOption } from "@/lib/models/property";

function formatPKR(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export function PropertyPaymentPlan({
  paymentOption,
  plan,
}: {
  paymentOption: PaymentOption;
  plan: PaymentPlanType;
}) {
  const rows: { label: string; value: string }[] = [];
  if (plan.totalPrice !== undefined) rows.push({ label: "Total Price", value: formatPKR(plan.totalPrice) });
  if (plan.downPayment !== undefined) rows.push({ label: "Down Payment", value: formatPKR(plan.downPayment) });
  if (plan.monthlyInstallment !== undefined)
    rows.push({ label: "Monthly Installment", value: formatPKR(plan.monthlyInstallment) });
  if (plan.durationMonths !== undefined) rows.push({ label: "Duration", value: `${plan.durationMonths} months` });
  if (plan.installmentsCount !== undefined)
    rows.push({ label: "Number of Installments", value: String(plan.installmentsCount) });

  // Nothing to show for a cash-only listing with no plan details entered.
  if (rows.length === 0 && paymentOption === "Cash") return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Wallet className="h-4.5 w-4.5 text-primary" /> Payment Plan
      </h2>
      <p className="mt-1 text-sm text-muted">{paymentOption}</p>

      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="rounded-xl border border-border p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="mt-0.5 text-sm font-bold text-ink">{r.value}</div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Payment details are subject to confirmation by 5STAR.M Estate & Builders.
      </p>
    </div>
  );
}
