"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, Home, Users, FileText } from "lucide-react";
import { createInvestmentLeadAction } from "@/lib/actions/investment.actions";

const ACTIONS = [
  { key: "Request Investment Analysis", icon: FileText },
  { key: "Request Property Consultation", icon: Users },
  { key: "Request Site Visit", icon: Home },
  { key: "Contact Agent", icon: MessageCircle },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

export function InvestmentCrmActions({ propertyId, projectId, itemLabel }: { propertyId?: string; projectId?: string; itemLabel: string }) {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(action: ActionKey) {
    setError(null);
    startTransition(async () => {
      try {
        await createInvestmentLeadAction({ name, phone, email: email || undefined, propertyId, projectId, action, message: `${action} for ${itemLabel}.`, consent, company });
        setSuccess(true);
        setName("");
        setPhone("");
        setEmail("");
        setConsent(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit your request.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h3 className="font-heading text-base font-bold text-ink">Talk to Us About This Investment</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setOpen(open === key ? null : key);
              setSuccess(false);
              setError(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold ${open === key ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary hover:text-primary"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {key}
          </button>
        ))}
      </div>

      {open && !success && (
        <div className="mt-4 space-y-3 rounded-xl bg-surface-muted p-4">
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone / WhatsApp" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary" />
            I agree to be contacted regarding this investment inquiry.
          </label>
          {error && <p className="text-xs font-semibold text-primary">{error}</p>}
          <button type="button" onClick={() => submit(open)} disabled={isPending} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {isPending ? "Sending..." : "Submit Request"}
          </button>
        </div>
      )}

      {success && (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> Thank you! Our team will contact you soon.
        </p>
      )}
    </div>
  );
}
