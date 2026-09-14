"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { SupportSettings, SupportDepartment } from "@/lib/models/support";
import { updateSupportSettingsAction } from "@/lib/actions/support.actions";

const inputClass = "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";
const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SupportSettingsForm({ settings, departments }: { settings: SupportSettings; departments: SupportDepartment[] }) {
  const [businessHoursStart, setBusinessHoursStart] = useState(settings.businessHoursStart);
  const [businessHoursEnd, setBusinessHoursEnd] = useState(settings.businessHoursEnd);
  const [businessDays, setBusinessDays] = useState<number[]>(settings.businessDays);
  const [defaultDepartmentId, setDefaultDepartmentId] = useState(settings.defaultDepartmentId ?? "");
  const [disclaimerText, setDisclaimerText] = useState(settings.disclaimerText);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setBusinessDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateSupportSettingsAction({ businessHoursStart, businessHoursEnd, businessDays, defaultDepartmentId: defaultDepartmentId || undefined, disclaimerText });
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Support settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Business Hours</h2>
        <p className="mt-1 text-xs text-muted">Used by SLA rules marked &quot;business hours only&quot;.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Start</span>
            <input type="time" value={businessHoursStart} onChange={(e) => setBusinessHoursStart(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">End</span>
            <input type="time" value={businessHoursEnd} onChange={(e) => setBusinessHoursEnd(e.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${businessDays.includes(day) ? "bg-primary text-primary-foreground" : "border border-border text-muted"}`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Fallback Department</h2>
        <p className="mt-1 text-xs text-muted">Used when a category has no configured department to route to.</p>
        <select value={defaultDepartmentId} onChange={(e) => setDefaultDepartmentId(e.target.value)} className={`${inputClass} mt-3 max-w-xs`}>
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Disclaimer</h2>
        <textarea value={disclaimerText} onChange={(e) => setDisclaimerText(e.target.value)} rows={3} className={`${inputClass} mt-3 w-full`} />
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Support Settings"}
      </button>
    </div>
  );
}
