import type { ReactNode } from "react";
import type { AgreementParty, PartyRelation } from "@/lib/rentAgreement/types";

// Small form pieces shared by the rent agreement and token receipt forms.

export const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
export const inputUrClass = `${inputClass} text-right`;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

/** An English box with an optional Urdu box beside it. */
export function Pair({ label, en, ur, onEn, onUr, textarea }: { label: string; en: string; ur: string; onEn: (v: string) => void; onUr: (v: string) => void; textarea?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label={label}>
        {textarea ? <textarea value={en} onChange={(e) => onEn(e.target.value)} rows={2} className={inputClass} /> : <input value={en} onChange={(e) => onEn(e.target.value)} className={inputClass} />}
      </Field>
      <Field label={`${label} - اردو میں (optional)`}>
        {textarea ? <textarea dir="rtl" value={ur} onChange={(e) => onUr(e.target.value)} rows={2} className={inputUrClass} /> : <input dir="rtl" value={ur} onChange={(e) => onUr(e.target.value)} className={inputUrClass} />}
      </Field>
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}


export function PartyFields({ title, party, onChange, picker }: { title: string; party: AgreementParty; onChange: (patch: Partial<AgreementParty>) => void; picker: ReactNode }) {
  return (
    <Section title={title}>
      {picker}
      <Pair label="Full name" en={party.name} ur={party.nameUr} onEn={(v) => onChange({ name: v })} onUr={(v) => onChange({ nameUr: v })} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Relation">
          <select value={party.relation} onChange={(e) => onChange({ relation: e.target.value as PartyRelation })} className={inputClass}>
            <option value="">-</option>
            <option value="S/O">Son of (ولد)</option>
            <option value="D/O">Daughter of (دختر)</option>
            <option value="W/O">Wife of (زوجہ)</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Pair label="Father / husband name" en={party.relationName} ur={party.relationNameUr} onEn={(v) => onChange({ relationName: v })} onUr={(v) => onChange({ relationNameUr: v })} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="CNIC number">
          <input value={party.cnic} onChange={(e) => onChange({ cnic: e.target.value })} placeholder="35202-1234567-1" className={inputClass} />
        </Field>
        <Field label="Phone / WhatsApp">
          <input value={party.phone} onChange={(e) => onChange({ phone: e.target.value })} type="tel" className={inputClass} />
        </Field>
      </div>
      <Pair label="Address" en={party.address} ur={party.addressUr} onEn={(v) => onChange({ address: v })} onUr={(v) => onChange({ addressUr: v })} textarea />
    </Section>
  );
}

