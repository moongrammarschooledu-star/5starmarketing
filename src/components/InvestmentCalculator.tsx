"use client";

import { useMemo, useState, type FormEvent } from "react";
import { TrendingUp, AlertCircle, Info, PhoneCall, CheckCircle2 } from "lucide-react";
import {
  calculateInvestment,
  validateInvestmentInput,
  formatPKR,
  INVESTMENT_DISCLAIMER,
  type InvestmentCalculationInput,
} from "@/lib/calculator";
import { getAttributionPayload } from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export function InvestmentCalculator({
  title = "Property Investment Calculator",
  purchasePrice: initialPurchasePrice,
  compact,
}: {
  title?: string;
  purchasePrice?: number;
  compact?: boolean;
}) {
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice ?? 5000000);
  const [initialInvestment, setInitialInvestment] = useState(initialPurchasePrice ?? 5000000);
  const [expectedSellingPrice, setExpectedSellingPrice] = useState<number | "">("");
  const [holdingPeriod, setHoldingPeriod] = useState(1);
  const [holdingPeriodUnit, setHoldingPeriodUnit] = useState<"Months" | "Years">("Years");

  const hasEnteredSellingPrice = expectedSellingPrice !== "";

  const input: InvestmentCalculationInput = {
    purchasePrice,
    initialInvestment,
    expectedSellingPrice: hasEnteredSellingPrice ? Number(expectedSellingPrice) : 0,
    holdingPeriod,
    holdingPeriodUnit,
  };
  const error = hasEnteredSellingPrice ? validateInvestmentInput(input) : null;
  const result = useMemo(
    () => (hasEnteredSellingPrice && !error ? calculateInvestment(input) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchasePrice, initialInvestment, expectedSellingPrice, holdingPeriod, error]
  );

  const [showConsultForm, setShowConsultForm] = useState(false);
  const [consultStatus, setConsultStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [consultError, setConsultError] = useState<string | null>(null);

  async function submitConsultation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setConsultError(null);

    if (typeof data.company === "string" && data.company.trim()) {
      setConsultStatus("success");
      form.reset();
      return;
    }

    const name = String(data.name ?? "").trim();
    const phone = String(data.phone ?? "").trim();
    if (!name || !phone) {
      setConsultError("Please enter your name and phone number.");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setConsultError("Please enter a valid phone number.");
      return;
    }

    setConsultStatus("submitting");
    try {
      // Non-sensitive summary only — the calculator's exact figures stay
      // in the visitor's browser, never stored against the lead.
      const summary = result
        ? `Used the investment calculator (${holdingPeriod} ${holdingPeriodUnit.toLowerCase()} holding period, ${result.estimatedGain >= 0 ? "positive" : "negative"} estimated return) and requested a consultation.`
        : "Requested an investment consultation.";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          message: summary,
          leadType: "Investment Inquiry",
          source: "Website",
          consent: true,
          ...getAttributionPayload(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Request failed");
      setConsultStatus("success");
      trackEvent("investment_consultation_request");
      form.reset();
    } catch (err) {
      setConsultError(err instanceof Error ? err.message : null);
      setConsultStatus("error");
    }
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-border bg-surface p-5 sm:p-6"}>
      {!compact && (
        <>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
            <TrendingUp className="h-5 w-5 text-primary" /> {title}
          </h2>
        </>
      )}
      {compact && (
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <TrendingUp className="h-4.5 w-4.5 text-primary" /> Estimated ROI
        </h3>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Purchase Price (Rs.)</span>
          <input
            type="number"
            min={0}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Initial Investment (Rs.)</span>
          <input
            type="number"
            min={0}
            value={initialInvestment}
            onChange={(e) => setInitialInvestment(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Expected Selling Price (Rs.)</span>
          <input
            type="number"
            min={0}
            placeholder="Enter to see your estimated return"
            value={expectedSellingPrice}
            onChange={(e) => setExpectedSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Holding Period</span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={holdingPeriod}
              onChange={(e) => setHoldingPeriod(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
            <select
              value={holdingPeriodUnit}
              onChange={(e) => setHoldingPeriodUnit(e.target.value as "Months" | "Years")}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="Years">Years</option>
              <option value="Months">Months</option>
            </select>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary" role="alert">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      {!hasEnteredSellingPrice && !compact && (
        <p className="mt-4 text-sm text-muted">Enter an expected selling price to see your estimated return.</p>
      )}

      {result && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ResultTile label="Initial Investment" value={formatPKR(initialInvestment)} />
            <ResultTile
              label="Estimated Gain"
              value={formatPKR(result.estimatedGain)}
              highlight={result.estimatedGain >= 0}
            />
            <ResultTile
              label="Estimated Return %"
              value={`${result.estimatedReturnPercent >= 0 ? "+" : ""}${result.estimatedReturnPercent}%`}
              highlight={result.estimatedGain >= 0}
            />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {INVESTMENT_DISCLAIMER}
          </p>

          {consultStatus === "success" ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> Thank you — our investment consultant will contact you soon.
            </p>
          ) : showConsultForm ? (
            <form onSubmit={submitConsultation} className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
              <input type="text" name="company" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Your name"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                />
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="03XX-XXXXXXX"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
                />
              </div>
              {consultError && <p className="mt-2 text-xs font-semibold text-primary">{consultError}</p>}
              <button
                type="submit"
                disabled={consultStatus === "submitting"}
                className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {consultStatus === "submitting" ? "Sending..." : "Request Consultation"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowConsultForm(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/30 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"
            >
              <PhoneCall className="h-4 w-4" /> Talk to an Investment Consultant
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ResultTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-success/30 bg-success/5" : "border-border"}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-heading text-base font-extrabold ${highlight ? "text-success" : "text-ink"}`}>{value}</div>
    </div>
  );
}
