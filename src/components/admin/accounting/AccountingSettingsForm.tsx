"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { AccountingSettings, CommissionCalcBasis } from "@/lib/models/accounting";
import { updateAccountingSettingsAction } from "@/lib/actions/accounting.actions";

export function AccountingSettingsForm({ settings }: { settings: AccountingSettings }) {
  const [defaultCommissionBasis, setDefaultCommissionBasis] = useState<CommissionCalcBasis>(settings.defaultCommissionBasis);
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(String(settings.fiscalYearStartMonth));
  const [currency, setCurrency] = useState(settings.currency);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateAccountingSettingsAction({ defaultCommissionBasis, fiscalYearStartMonth: Number(fiscalYearStartMonth), currency });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save settings.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}
      {saved && !isPending && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Accounting settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Commission Default</h2>
        <p className="mt-1 text-xs text-muted">The pre-selected basis when creating a new commission rule — still overridable per rule.</p>
        <label className="mt-3 flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Default Basis</span>
          <select value={defaultCommissionBasis} onChange={(e) => setDefaultCommissionBasis(e.target.value as CommissionCalcBasis)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="DEAL_AMOUNT">Deal Amount</option>
            <option value="COLLECTED_AMOUNT">Collected Amount</option>
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Fiscal Year &amp; Currency</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Fiscal Year Start Month</span>
            <select value={fiscalYearStartMonth} onChange={(e) => setFiscalYearStartMonth(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Currency</span>
            <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">Architected for future multi-currency support — every amount today is stored and calculated in this one currency.</p>
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Accounting Settings"}
      </button>
    </div>
  );
}
