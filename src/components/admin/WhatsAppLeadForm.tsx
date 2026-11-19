"use client";

import { useActionState } from "react";
import { AlertCircle, MessageCircle } from "lucide-react";
import { createWhatsAppLeadAction, type WhatsAppLeadFormState } from "@/lib/actions/whatsappLeads.actions";
import { WHATSAPP_LEAD_ADS, WHATSAPP_LEAD_STATUSES, WHATSAPP_LEAD_WANTS } from "@/lib/whatsappLead";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary";

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function WhatsAppLeadForm() {
  const [state, formAction, pending] = useActionState<WhatsAppLeadFormState, FormData>(createWhatsAppLeadAction, {});

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {state.error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Naam" required>
          <input name="name" required maxLength={120} placeholder="Jis ne WhatsApp kiya" className={inputClass} autoFocus />
        </Field>
        <Field label="Phone / WhatsApp number" required hint="WhatsApp chat ke upar jo number hai wohi likhein.">
          <input name="phone" type="tel" required inputMode="tel" placeholder="03XX-XXXXXXX" className={inputClass} />
        </Field>

        <Field label="Kis ad se aaya?">
          <select name="ad" defaultValue="rent" className={inputClass}>
            {WHATSAPP_LEAD_ADS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kya chahiye?">
          <select name="want" defaultValue="rent-in" className={inputClass}>
            {WHATSAPP_LEAD_WANTS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Area" hint="Jahan property chahiye ya jahan hai.">
          <input name="area" maxLength={200} placeholder="Johar Town, Faisal Town ..." className={inputClass} />
        </Field>
        <Field label="Budget / kiraya" hint='Jaise "35 hazar", "75 lac" ya "1.5 crore".'>
          <input name="budget" maxLength={80} placeholder="Rs. ..." className={inputClass} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Chat ka khulasa / notes" hint="Chat se zaroori baat copy karke yahan paste kar sakte hain.">
            <textarea name="notes" rows={4} maxLength={2000} placeholder="Kitne bedroom, kab tak chahiye, koi khaas shart ..." className={`${inputClass} resize-y`} />
          </Field>
        </div>

        <Field label="Lead ki halat">
          <select name="status" defaultValue="Contacted" className={inputClass}>
            {WHATSAPP_LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "Contacted" ? "Contacted (hum baat kar chuke)" : s === "New" ? "New (abhi baat nahi hui)" : s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" /> {pending ? "Save ho raha hai..." : "Lead save karein"}
      </button>
    </form>
  );
}
