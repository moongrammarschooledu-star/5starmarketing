"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { MaintenanceSettings } from "@/lib/models/maintenance";
import { updateMaintenanceSettingsAction } from "@/lib/actions/maintenance.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function MaintenanceSettingsForm({ settings }: { settings: MaintenanceSettings }) {
  const [recurringIssueThresholdCount, setRecurringIssueThresholdCount] = useState(String(settings.recurringIssueThresholdCount));
  const [recurringIssueWindowDays, setRecurringIssueWindowDays] = useState(String(settings.recurringIssueWindowDays));
  const [warrantyAlertDaysBefore, setWarrantyAlertDaysBefore] = useState(String(settings.warrantyAlertDaysBefore));
  const [preventiveMaintenanceAlertDaysBefore, setPreventiveMaintenanceAlertDaysBefore] = useState(String(settings.preventiveMaintenanceAlertDaysBefore));
  const [conditionScoreExcellentMin, setConditionScoreExcellentMin] = useState(String(settings.conditionScoreExcellentMin));
  const [conditionScoreGoodMin, setConditionScoreGoodMin] = useState(String(settings.conditionScoreGoodMin));
  const [conditionScoreFairMin, setConditionScoreFairMin] = useState(String(settings.conditionScoreFairMin));
  const [conditionScoreNeedsAttentionMin, setConditionScoreNeedsAttentionMin] = useState(String(settings.conditionScoreNeedsAttentionMin));
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
        await updateMaintenanceSettingsAction({
          recurringIssueThresholdCount: Number(recurringIssueThresholdCount),
          recurringIssueWindowDays: Number(recurringIssueWindowDays),
          warrantyAlertDaysBefore: Number(warrantyAlertDaysBefore),
          preventiveMaintenanceAlertDaysBefore: Number(preventiveMaintenanceAlertDaysBefore),
          conditionScoreExcellentMin: Number(conditionScoreExcellentMin),
          conditionScoreGoodMin: Number(conditionScoreGoodMin),
          conditionScoreFairMin: Number(conditionScoreFairMin),
          conditionScoreNeedsAttentionMin: Number(conditionScoreNeedsAttentionMin),
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Maintenance settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Recurring Issue Detection</h2>
        <p className="mt-1 text-xs text-muted">Flags the same property/category combination when it repeats — never an automated diagnosis.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumField label="Threshold (requests)" value={recurringIssueThresholdCount} onChange={setRecurringIssueThresholdCount} />
          <NumField label="Window (days)" value={recurringIssueWindowDays} onChange={setRecurringIssueWindowDays} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Alert Lead Times</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumField label="Warranty Expiry Alert (days before)" value={warrantyAlertDaysBefore} onChange={setWarrantyAlertDaysBefore} />
          <NumField label="Preventive Maintenance Alert (days before)" value={preventiveMaintenanceAlertDaysBefore} onChange={setPreventiveMaintenanceAlertDaysBefore} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Condition Score Bands</h2>
        <p className="mt-1 text-xs text-muted">Minimum score (0-100) for each label. Below the lowest band is scored Critical.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumField label="Excellent ≥" value={conditionScoreExcellentMin} onChange={setConditionScoreExcellentMin} />
          <NumField label="Good ≥" value={conditionScoreGoodMin} onChange={setConditionScoreGoodMin} />
          <NumField label="Fair ≥" value={conditionScoreFairMin} onChange={setConditionScoreFairMin} />
          <NumField label="Needs Attention ≥" value={conditionScoreNeedsAttentionMin} onChange={setConditionScoreNeedsAttentionMin} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Currency &amp; Disclaimer</h2>
        <label className="mt-3 flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Currency</span>
          <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Inspection Report Disclaimer</span>
          <textarea value={disclaimerText} onChange={(e) => setDisclaimerText(e.target.value)} className={`${inputClass} min-h-32`} />
        </label>
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Maintenance Settings"}
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
