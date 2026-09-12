"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ValuationSettings } from "@/lib/models/investment";
import { updateValuationSettingsAction } from "@/lib/actions/investment.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function ValuationSettingsForm({ settings }: { settings: ValuationSettings }) {
  const [sqftPerSqyd, setSqftPerSqyd] = useState(String(settings.sqftPerSqyd));
  const [sqftPerMarla, setSqftPerMarla] = useState(String(settings.sqftPerMarla));
  const [sqftPerKanal, setSqftPerKanal] = useState(String(settings.sqftPerKanal));
  const [sqftPerAcre, setSqftPerAcre] = useState(String(settings.sqftPerAcre));
  const [minComparablesForHigh, setMinComparablesForHigh] = useState(String(settings.minComparablesForHigh));
  const [minComparablesForMedium, setMinComparablesForMedium] = useState(String(settings.minComparablesForMedium));
  const [maxMarketDataAgeMonthsForHigh, setMaxMarketDataAgeMonthsForHigh] = useState(String(settings.maxMarketDataAgeMonthsForHigh));
  const [defaultVacancyRate, setDefaultVacancyRate] = useState(String(settings.defaultVacancyRate));
  const [defaultMaintenanceRate, setDefaultMaintenanceRate] = useState(String(settings.defaultMaintenanceRate));
  const [defaultManagementFeeRate, setDefaultManagementFeeRate] = useState(String(settings.defaultManagementFeeRate));
  const [defaultInvestmentHorizonYears, setDefaultInvestmentHorizonYears] = useState(String(settings.defaultInvestmentHorizonYears));
  const [currency, setCurrency] = useState(settings.currency);
  const [disclaimerText, setDisclaimerText] = useState(settings.disclaimerText);

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateValuationSettingsAction({
          sqftPerSqyd: Number(sqftPerSqyd),
          sqftPerMarla: Number(sqftPerMarla),
          sqftPerKanal: Number(sqftPerKanal),
          sqftPerAcre: Number(sqftPerAcre),
          minComparablesForHigh: Number(minComparablesForHigh),
          minComparablesForMedium: Number(minComparablesForMedium),
          maxMarketDataAgeMonthsForHigh: Number(maxMarketDataAgeMonthsForHigh),
          defaultVacancyRate: Number(defaultVacancyRate),
          defaultMaintenanceRate: Number(defaultMaintenanceRate),
          defaultManagementFeeRate: Number(defaultManagementFeeRate),
          defaultInvestmentHorizonYears: Number(defaultInvestmentHorizonYears),
          currency,
          disclaimerText,
        });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save settings.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}
      {saved && !isPending && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Investment settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Area Conversion Factors</h2>
        <p className="mt-1 text-xs text-muted">Square feet is the base unit. Every area-based calculation across the module uses these factors — never a hardcoded local convention.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumField label="Sqft / Sq Yd" value={sqftPerSqyd} onChange={setSqftPerSqyd} />
          <NumField label="Sqft / Marla" value={sqftPerMarla} onChange={setSqftPerMarla} />
          <NumField label="Sqft / Kanal" value={sqftPerKanal} onChange={setSqftPerKanal} />
          <NumField label="Sqft / Acre" value={sqftPerAcre} onChange={setSqftPerAcre} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Confidence Thresholds</h2>
        <p className="mt-1 text-xs text-muted">Controls when a valuation is scored HIGH/MEDIUM/LOW confidence.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumField label="Min Comparables for HIGH" value={minComparablesForHigh} onChange={setMinComparablesForHigh} />
          <NumField label="Min Comparables for MEDIUM" value={minComparablesForMedium} onChange={setMinComparablesForMedium} />
          <NumField label="Max Market Data Age (months) for HIGH" value={maxMarketDataAgeMonthsForHigh} onChange={setMaxMarketDataAgeMonthsForHigh} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Default Expense Assumptions</h2>
        <p className="mt-1 text-xs text-muted">Pre-filled defaults for rental yield and cash-flow calculators — always overridable per calculation.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumField label="Vacancy Rate %" value={defaultVacancyRate} onChange={setDefaultVacancyRate} />
          <NumField label="Maintenance Rate %" value={defaultMaintenanceRate} onChange={setDefaultMaintenanceRate} />
          <NumField label="Management Fee Rate %" value={defaultManagementFeeRate} onChange={setDefaultManagementFeeRate} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Horizon &amp; Currency</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumField label="Default Investment Horizon (years)" value={defaultInvestmentHorizonYears} onChange={setDefaultInvestmentHorizonYears} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Currency</span>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Investment Disclaimer</h2>
        <p className="mt-1 text-xs text-muted">Shown on every valuation, calculator result, report, and investment page.</p>
        <textarea value={disclaimerText} onChange={(e) => setDisclaimerText(e.target.value)} className={`${inputClass} mt-3 min-h-32 w-full`} />
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Investment Settings"}
      </button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}
