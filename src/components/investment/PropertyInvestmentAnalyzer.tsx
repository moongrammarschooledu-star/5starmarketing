"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Info, Save, Calculator } from "lucide-react";
import { computeInvestmentResults } from "@/lib/investment/computeAnalysis";
import type { InvestmentInputs, InvestmentScenario, ValuationSettings } from "@/lib/models/investment";
import { createAnalysisAction, trackInvestmentEventAction } from "@/lib/actions/investment.actions";

function formatMoney(value: number, currency: string): string {
  return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
}

export function PropertyInvestmentAnalyzer({
  propertyId,
  propertyTitle,
  purchasePrice,
  scenarios,
  settings,
  isSignedIn,
}: {
  propertyId: string;
  propertyTitle: string;
  purchasePrice: number;
  scenarios: InvestmentScenario[];
  settings: ValuationSettings;
  isSignedIn: boolean;
}) {
  const defaultScenario = scenarios.find((s) => s.isDefault) ?? scenarios[0];
  const [rentalEstimate, setRentalEstimate] = useState("");
  const [horizonYears, setHorizonYears] = useState(String(settings.defaultInvestmentHorizonYears));
  const [scenarioId, setScenarioId] = useState(defaultScenario?.id ?? "");
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [vacancyRate, setVacancyRate] = useState(String(settings.defaultVacancyRate));
  const [maintenanceRate, setMaintenanceRate] = useState(String(settings.defaultMaintenanceRate));
  const [managementFeeRate, setManagementFeeRate] = useState(String(settings.defaultManagementFeeRate));
  const [acquisitionCosts, setAcquisitionCosts] = useState("");
  const [analysisName, setAnalysisName] = useState(`${propertyTitle} — Investment Analysis`);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const scenario = scenarios.find((s) => s.id === scenarioId);

  const inputs: InvestmentInputs = useMemo(
    () => ({
      purchasePrice,
      acquisitionCosts: acquisitionCosts ? Number(acquisitionCosts) : undefined,
      rentalEstimateMonthly: rentalEstimate ? Number(rentalEstimate) : undefined,
      vacancyRate: Number(vacancyRate) || 0,
      maintenanceRate: Number(maintenanceRate) || 0,
      managementFeeRate: Number(managementFeeRate) || 0,
      investmentHorizonYears: Number(horizonYears) || settings.defaultInvestmentHorizonYears,
      scenarioId,
      annualAppreciationRatePercent: scenario?.annualAppreciationRate ?? 0,
    }),
    [purchasePrice, acquisitionCosts, rentalEstimate, vacancyRate, maintenanceRate, managementFeeRate, horizonYears, scenarioId, scenario, settings.defaultInvestmentHorizonYears]
  );

  const { results } = useMemo(() => computeInvestmentResults(inputs), [inputs]);
  const hasRental = !!inputs.rentalEstimateMonthly && inputs.rentalEstimateMonthly > 0;

  function save() {
    setSaveMessage(null);
    startTransition(async () => {
      try {
        await createAnalysisAction({ propertyId, name: analysisName, scenarioName: scenario?.name, inputs });
        await trackInvestmentEventAction({ eventType: "analysis_saved", propertyId });
        setSaveMessage("Analysis saved.");
      } catch (e) {
        setSaveMessage(e instanceof Error ? e.message : "Please sign in to save an analysis.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
        <Calculator className="h-5 w-5 text-primary" /> Investment Calculator
      </h2>
      <p className="mt-1 text-xs text-muted">Based on the selected assumptions — adjust any field to see updated estimates.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Estimated Monthly Rent (optional)</span>
          <input type="number" min="0" value={rentalEstimate} onChange={(e) => setRentalEstimate(e.target.value)} placeholder="e.g. 50000" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Investment Horizon (years)</span>
          <input type="number" min="1" value={horizonYears} onChange={(e) => setHorizonYears(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-ink">Appreciation Scenario</span>
          <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.annualAppreciationRate}% / year)
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" onClick={() => setShowAssumptions((v) => !v)} className="mt-3 text-xs font-bold text-primary hover:underline">
        {showAssumptions ? "Hide" : "Show"} advanced assumptions
      </button>
      {showAssumptions && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-surface-muted p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink">Vacancy Rate (%)</span>
            <input type="number" min="0" value={vacancyRate} onChange={(e) => setVacancyRate(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink">Maintenance Rate (%)</span>
            <input type="number" min="0" value={maintenanceRate} onChange={(e) => setMaintenanceRate(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink">Management Fee (%)</span>
            <input type="number" min="0" value={managementFeeRate} onChange={(e) => setManagementFeeRate(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink">Acquisition Costs</span>
            <input type="number" min="0" value={acquisitionCosts} onChange={(e) => setAcquisitionCosts(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Gross Rental Yield" value={hasRental ? `${results.grossRentalYieldPercent.toFixed(2)}%` : "Data unavailable"} />
        <Metric label="Net Rental Yield" value={hasRental ? `${results.netRentalYieldPercent.toFixed(2)}%` : "Data unavailable"} />
        <Metric label={`Projected Value (Yr ${inputs.investmentHorizonYears})`} value={formatMoney(results.projectedExitValue, settings.currency)} />
        <Metric label="Estimated ROI" value={`${results.estimatedRoiPercent.toFixed(2)}%`} accent />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Total Investment" value={formatMoney(results.totalInvestment, settings.currency)} small />
        <Metric label="Estimated Gain" value={formatMoney(results.estimatedGain, settings.currency)} small />
        <Metric label="Annualized Return" value={results.annualizedReturnPercent != null ? `${results.annualizedReturnPercent.toFixed(2)}%` : results.annualizedReturnNote ?? "—"} small />
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> ESTIMATE only. {settings.disclaimerText}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isSignedIn ? (
          <>
            <input type="text" value={analysisName} onChange={(e) => setAnalysisName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <button type="button" onClick={save} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              <Save className="h-4 w-4" /> {isPending ? "Saving..." : "Save Analysis"}
            </button>
            {saveMessage && <span className="text-xs font-semibold text-muted">{saveMessage}</span>}
          </>
        ) : (
          <Link href="/login" className="text-sm font-bold text-primary hover:underline">
            Sign in to save this analysis →
          </Link>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading ${small ? "text-sm" : "text-base"} font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
