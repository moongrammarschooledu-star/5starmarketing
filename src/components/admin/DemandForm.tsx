"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { formatMarla, formatPrice, parsePriceText, parseSizeToMarla } from "@/lib/pkUnits";
import { demandPriorities, demandPurposes, demandStatuses, type PropertyDemand } from "@/lib/models/demand";
import { propertyTypes } from "@/lib/models/property";
import type { DemandFormState } from "@/lib/actions/demands.actions";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary";

function Label({ text, hint, required, children }: { text: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {text} {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** A text box for a budget or size, with a live line showing how the system
 *  reads what was typed - so a typo is noticed before saving. */
function UnitField({
  label,
  name,
  initial,
  placeholder,
  parse,
  show,
}: {
  label: string;
  name: string;
  initial: string;
  placeholder: string;
  parse: (s: string) => number | null;
  show: (n: number) => string;
}) {
  const [value, setValue] = useState(initial);
  const parsed = value.trim() ? parse(value) : null;
  return (
    <Label text={label}>
      <input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={inputClass} />
      {value.trim() &&
        (parsed !== null ? (
          <span className="text-xs font-semibold text-success">Read as: {show(parsed)}</span>
        ) : (
          <span className="text-xs font-semibold text-primary">Cannot read this - write it like the examples</span>
        ))}
    </Label>
  );
}

export function DemandForm({
  action,
  initialValues,
  team,
  submitLabel,
}: {
  action: (state: DemandFormState, formData: FormData) => Promise<DemandFormState>;
  initialValues?: PropertyDemand;
  team: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = initialValues;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Client</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Label text="Client name" required>
            <input name="clientName" defaultValue={v?.clientName} required className={inputClass} />
          </Label>
          <Label text="Phone" required>
            <input name="clientPhone" defaultValue={v?.clientPhone} required type="tel" placeholder="03XX XXXXXXX" className={inputClass} />
          </Label>
          <Label text="WhatsApp (if different)">
            <input name="clientWhatsapp" defaultValue={v?.clientWhatsapp} type="tel" className={inputClass} />
          </Label>
          <Label text="Priority">
            <select name="priority" defaultValue={v?.priority ?? "Normal"} className={inputClass}>
              {demandPriorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">What the client is looking for</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Label text="Wants to" required>
            <select name="purpose" defaultValue={v?.purpose ?? "For Sale"} className={inputClass}>
              {demandPurposes.map((p) => (
                <option key={p} value={p}>
                  {p === "For Sale" ? "Buy (For Sale)" : "Rent (For Rent)"}
                </option>
              ))}
            </select>
          </Label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="font-semibold text-ink">Property type</legend>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
              {propertyTypes.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="propertyTypes" value={t} defaultChecked={v?.propertyTypes.includes(t)} className="h-4 w-4 rounded border-border text-primary" />
                  {t}
                </label>
              ))}
            </div>
            <span className="text-xs text-muted">Leave all unticked if any type is fine.</span>
          </fieldset>

          <div className="sm:col-span-2">
            <Label text="Areas" hint="Separate with commas. Leave empty for anywhere.">
              <input name="locations" defaultValue={v?.locations.join(", ")} placeholder="Johar Town, DHA Lahore, Bahria Town" className={inputClass} />
            </Label>
          </div>

          <UnitField label="Budget - from" name="budgetMin" initial={v?.budgetMin != null ? formatPrice(v.budgetMin) : ""} placeholder="e.g. 1 crore" parse={parsePriceText} show={(n) => `${formatPrice(n)} (Rs ${n.toLocaleString("en-US")})`} />
          <UnitField label="Budget - up to" name="budgetMax" initial={v?.budgetMax != null ? formatPrice(v.budgetMax) : ""} placeholder="e.g. 1.5 crore, 75 lac" parse={parsePriceText} show={(n) => `${formatPrice(n)} (Rs ${n.toLocaleString("en-US")})`} />
          <UnitField label="Size - from" name="sizeMin" initial={v?.sizeMinMarla != null ? formatMarla(v.sizeMinMarla) : ""} placeholder="e.g. 8 marla" parse={parseSizeToMarla} show={(n) => `${formatMarla(n)} (${Math.round(n * 225).toLocaleString("en-US")} sq ft)`} />
          <UnitField label="Size - up to" name="sizeMax" initial={v?.sizeMaxMarla != null ? formatMarla(v.sizeMaxMarla) : ""} placeholder="e.g. 10 marla, 1 kanal" parse={parseSizeToMarla} show={(n) => `${formatMarla(n)} (${Math.round(n * 225).toLocaleString("en-US")} sq ft)`} />

          <Label text="Minimum bedrooms">
            <input name="minBedrooms" defaultValue={v?.minBedrooms} type="number" min={0} max={20} className={inputClass} />
          </Label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Handling</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Label text="Assigned to">
            <select name="assignedTo" defaultValue={v?.assignedTo ?? ""} className={inputClass}>
              <option value="">Not assigned</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Label>
          {v && (
            <Label text="Status">
              <select name="status" defaultValue={v.status} className={inputClass}>
                {demandStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Label>
          )}
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/50 p-3.5 text-sm sm:col-span-2">
            <input type="checkbox" name="showOnSite" defaultChecked={v?.showOnSite ?? true} className="mt-0.5 h-4 w-4 rounded border-border text-primary" />
            <span>
              <span className="font-semibold text-ink">Show on the website news bar</span>
              <span className="mt-0.5 block text-xs text-muted">
                Visitors see only the type, size, area and budget (for example &quot;5 Marla House to buy in Johar Town - budget up to 1.5 Crore&quot;). The client&apos;s name, phone and notes are never shown.
              </span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <Label text="Notes">
              <textarea name="notes" defaultValue={v?.notes} rows={3} placeholder="Anything else the client said - family size, parking, near a school, in a hurry..." className={`${inputClass} resize-none`} />
            </Label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link href="/admin/demands" className="rounded-full border-2 border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/30">
          Cancel
        </Link>
      </div>
    </form>
  );
}
