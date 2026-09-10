"use client";

import { useMemo, useState } from "react";
import { TrendingUp, AlertCircle, Info } from "lucide-react";
import {
  calculateInvestment,
  validateInvestmentInput,
  formatPKR,
  INVESTMENT_DISCLAIMER,
  type InvestmentCalculationInput,
} from "@/lib/calculator";

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
