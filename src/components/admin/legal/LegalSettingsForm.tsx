"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { LegalSettings, ConfidentialityLevel } from "@/lib/models/legal";
import { confidentialityLevels } from "@/lib/models/legal";
import { updateLegalSettingsAction } from "@/lib/actions/legal.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

function parseDays(value: string): number[] {
  return value
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((n) => !Number.isNaN(n) && n >= 0)
    .sort((a, b) => b - a);
}

export function LegalSettingsForm({ settings }: { settings: LegalSettings }) {
  const [documentExpiryReminderDaysBefore, setDocumentExpiryReminderDaysBefore] = useState(settings.documentExpiryReminderDaysBefore.join(", "));
  const [dueDiligenceDeadlineReminderDays, setDueDiligenceDeadlineReminderDays] = useState(settings.dueDiligenceDeadlineReminderDays.join(", "));
  const [complianceReviewReminderDays, setComplianceReviewReminderDays] = useState(settings.complianceReviewReminderDays.join(", "));
  const [requireLegalClearanceForDealCompletion, setRequireLegalClearanceForDealCompletion] = useState(settings.requireLegalClearanceForDealCompletion);
  const [defaultConfidentialityLevel, setDefaultConfidentialityLevel] = useState<ConfidentialityLevel>(settings.defaultConfidentialityLevel);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    const docDays = parseDays(documentExpiryReminderDaysBefore);
    const ddDays = parseDays(dueDiligenceDeadlineReminderDays);
    const complianceDays = parseDays(complianceReviewReminderDays);
    if (docDays.length === 0 || ddDays.length === 0 || complianceDays.length === 0) {
      setError("Please enter at least one valid reminder day for each field.");
      return;
    }
    startTransition(async () => {
      try {
        await updateLegalSettingsAction({
          documentExpiryReminderDaysBefore: docDays,
          dueDiligenceDeadlineReminderDays: ddDays,
          complianceReviewReminderDays: complianceDays,
          requireLegalClearanceForDealCompletion,
          defaultConfidentialityLevel,
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Legal settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Reminders</h2>
        <p className="mt-1 text-xs text-muted">Configurable — never a hardcoded reminder rule.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Document Expiry (days before)</span>
            <input type="text" value={documentExpiryReminderDaysBefore} onChange={(e) => setDocumentExpiryReminderDaysBefore(e.target.value)} placeholder="30, 7, 1" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Due-Diligence Deadline (days before)</span>
            <input type="text" value={dueDiligenceDeadlineReminderDays} onChange={(e) => setDueDiligenceDeadlineReminderDays(e.target.value)} placeholder="7, 3, 1" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Compliance Review (days before)</span>
            <input type="text" value={complianceReviewReminderDays} onChange={(e) => setComplianceReviewReminderDays(e.target.value)} placeholder="30, 7" className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Deal Completion Gate</h2>
        <p className="mt-1 text-xs text-muted">Defaults OFF so existing/in-flight deals are never retroactively blocked.</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={requireLegalClearanceForDealCompletion} onChange={(e) => setRequireLegalClearanceForDealCompletion(e.target.checked)} />
          Require legal clearance before a deal can be marked Completed
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Default Confidentiality Level</h2>
        <select value={defaultConfidentialityLevel} onChange={(e) => setDefaultConfidentialityLevel(e.target.value as ConfidentialityLevel)} className={`${inputClass} mt-3 max-w-xs`}>
          {confidentialityLevels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Legal Settings"}
      </button>
    </div>
  );
}
