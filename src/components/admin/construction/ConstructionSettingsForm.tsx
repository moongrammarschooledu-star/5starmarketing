"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ConstructionSettings } from "@/lib/models/construction";
import { updateConstructionSettingsAction } from "@/lib/actions/construction.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function ConstructionSettingsForm({ settings }: { settings: ConstructionSettings }) {
  const [thresholds, setThresholds] = useState(settings.budgetAlertThresholds.join(", "));
  const [defaultRetentionPercent, setDefaultRetentionPercent] = useState(String(settings.defaultRetentionPercent));
  const [currency, setCurrency] = useState(settings.currency);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    const parsedThresholds = thresholds
      .split(",")
      .map((t) => Number(t.trim()))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    if (parsedThresholds.length === 0) {
      setError("Please enter at least one valid budget alert threshold.");
      return;
    }
    startTransition(async () => {
      try {
        await updateConstructionSettingsAction({
          budgetAlertThresholds: parsedThresholds.sort((a, b) => a - b),
          defaultRetentionPercent: Number(defaultRetentionPercent),
          currency,
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Construction settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Budget Alert Thresholds</h2>
        <p className="mt-1 text-xs text-muted">Comma-separated percentages of a budget category&apos;s spend that trigger an alert — never auto-stops construction.</p>
        <label className="mt-3 flex max-w-sm flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Thresholds (%)</span>
          <input type="text" value={thresholds} onChange={(e) => setThresholds(e.target.value)} placeholder="70, 80, 90, 100" className={inputClass} />
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Retention &amp; Currency</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Default Retention (%)</span>
            <input type="number" value={defaultRetentionPercent} onChange={(e) => setDefaultRetentionPercent(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Currency</span>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
          </label>
        </div>
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Construction Settings"}
      </button>
    </div>
  );
}
