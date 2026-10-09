"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createHouseDesignAction, type NewDesignState } from "@/lib/actions/houseDesign.actions";
import { PLOT_PRESETS } from "@/lib/house/catalog";
import { DEFAULT_AUTO_SPEC } from "@/lib/house/autoLayout";
import { AutoPlanFields, type AutoCounts } from "./AutoPlanFields";

/** Sensible starting room counts for each plot size. */
const SUGGESTED: Record<string, Partial<AutoCounts>> = {
  "3m": { bedrooms: 2, bathrooms: 2, lounges: 1, drawing: false, stores: 0 },
  "5m": { bedrooms: 3, bathrooms: 3 },
  "7m": { bedrooms: 3, bathrooms: 3, dining: true },
  "10m": { bedrooms: 4, bathrooms: 4, dining: true, garage: true },
  "1k": { bedrooms: 5, bathrooms: 6, dining: true, garage: true, study: true, prayer: true, lounges: 2 },
  "2k": { bedrooms: 6, bathrooms: 7, dining: true, garage: true, study: true, prayer: true, lounges: 2, stores: 2 },
};

function defaultCounts(plot: string): AutoCounts {
  const { width, length, floors, floorHeight, ...counts } = DEFAULT_AUTO_SPEC;
  void width;
  void length;
  void floors;
  void floorHeight;
  return { ...counts, ...(SUGGESTED[plot] ?? {}) };
}

const inputClass = "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function NewDesignForm({ projects }: { projects: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState<NewDesignState, FormData>(createHouseDesignAction, {});
  const [plot, setPlot] = useState("5m");
  const [auto, setAuto] = useState(true);
  const [counts, setCounts] = useState<AutoCounts>(() => defaultCounts("5m"));

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Design name *">
          <input name="name" required maxLength={120} placeholder="e.g. Mr. Ahmed - 5 Marla House" className={inputClass} />
        </Field>
        <Field label="Client">
          <input name="clientName" maxLength={120} className={inputClass} />
        </Field>

        <Field label="Plot size">
          <select
            name="plot"
            value={plot}
            onChange={(e) => {
              setPlot(e.target.value);
              setCounts(defaultCounts(e.target.value));
            }}
            className={inputClass}
          >
            {PLOT_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Other size (type below)</option>
          </select>
        </Field>
        {plot === "custom" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width (ft)">
              <input name="customWidth" inputMode="decimal" required className={inputClass} />
            </Field>
            <Field label="Length (ft)" hint="Front to back">
              <input name="customLength" inputMode="decimal" required className={inputClass} />
            </Field>
          </div>
        ) : auto ? (
          <div className="hidden" />
        ) : (
          <Field label="Start with" hint={plot === "5m" ? undefined : "The sample layout is only for the 5 Marla plot."}>
            <select name="template" defaultValue="blank" className={inputClass}>
              <option value="blank">An empty plot</option>
              {plot === "5m" && <option value="5marla">5 Marla sample ground floor (editable)</option>}
            </select>
          </Field>
        )}

        <Field label="Floors">
          <select name="floors" defaultValue="1" className={inputClass}>
            <option value="1">1 - Ground floor only</option>
            <option value="2">2 - Ground + First</option>
            <option value="3">3 - Ground + First + Second</option>
            <option value="4">4 floors</option>
          </select>
        </Field>
        <Field label="Floor height (ft)" hint="Floor to ceiling. 10 ft is usual.">
          <input name="floorHeight" defaultValue="10" inputMode="decimal" className={inputClass} />
        </Field>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
            Draw the naqsha for me automatically
          </label>
          <p className="mt-1 text-xs text-muted">Tell us the rooms you want. The plan, doors, windows, 3D view and elevations are made for you, and you can change anything afterwards.</p>
          {auto && (
            <div className="mt-4">
              <AutoPlanFields value={counts} onChange={setCounts} />
              <input type="hidden" name="autoSpec" value={JSON.stringify(counts)} />
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <Field label="Construction project (optional)">
            <select name="constructionProjectId" defaultValue="" className={inputClass}>
              <option value="">Not linked</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
          {pending ? "Creating..." : "Create and open"}
        </button>
        <Link href="/admin/house-designer" className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink hover:border-ink/30">
          Cancel
        </Link>
      </div>
    </form>
  );
}
