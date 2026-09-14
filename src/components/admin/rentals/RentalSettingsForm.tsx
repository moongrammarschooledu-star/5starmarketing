"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { RentalSettings, LateFeeType } from "@/lib/models/rental";
import { lateFeeTypes } from "@/lib/models/rental";
import { updateRentalSettingsAction } from "@/lib/actions/rental.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

export function RentalSettingsForm({ settings }: { settings: RentalSettings }) {
  const [defaultGracePeriodDays, setDefaultGracePeriodDays] = useState(String(settings.defaultGracePeriodDays));
  const [defaultLateFeeType, setDefaultLateFeeType] = useState<LateFeeType>(settings.defaultLateFeeType);
  const [defaultLateFeeValue, setDefaultLateFeeValue] = useState(String(settings.defaultLateFeeValue));
  const [leaseExpiryReminderDays, setLeaseExpiryReminderDays] = useState(settings.leaseExpiryReminderDays.join(", "));
  const [rentDueReminderDaysBefore, setRentDueReminderDaysBefore] = useState(String(settings.rentDueReminderDaysBefore));
  const [currency, setCurrency] = useState(settings.currency);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    const reminderDays = leaseExpiryReminderDays
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    if (reminderDays.length === 0) {
      setError("Please enter at least one valid lease expiry reminder day.");
      return;
    }
    startTransition(async () => {
      try {
        await updateRentalSettingsAction({
          defaultGracePeriodDays: Number(defaultGracePeriodDays),
          defaultLateFeeType,
          defaultLateFeeValue: Number(defaultLateFeeValue),
          leaseExpiryReminderDays: reminderDays.sort((a, b) => b - a),
          rentDueReminderDaysBefore: Number(rentDueReminderDaysBefore),
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Rental settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Default Late Fee Rule</h2>
        <p className="mt-1 text-xs text-muted">Applies only when a lease doesn&apos;t configure its own rule — never overrides an existing lease setting.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Type</span>
            <select value={defaultLateFeeType} onChange={(e) => setDefaultLateFeeType(e.target.value as LateFeeType)} className={inputClass}>
              {lateFeeTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Value</span>
            <input type="number" value={defaultLateFeeValue} onChange={(e) => setDefaultLateFeeValue(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Grace Period (days)</span>
            <input type="number" value={defaultGracePeriodDays} onChange={(e) => setDefaultGracePeriodDays(e.target.value)} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Reminders</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Lease Expiry Reminder Days</span>
            <input type="text" value={leaseExpiryReminderDays} onChange={(e) => setLeaseExpiryReminderDays(e.target.value)} placeholder="60, 30, 7" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Rent Due Reminder (days before)</span>
            <input type="number" value={rentDueReminderDaysBefore} onChange={(e) => setRentDueReminderDaysBefore(e.target.value)} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Currency</h2>
        <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputClass} mt-3 max-w-xs`} />
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Rental Settings"}
      </button>
    </div>
  );
}
