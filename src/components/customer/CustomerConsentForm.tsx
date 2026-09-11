"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Customer } from "@/lib/models/customer";
import { updateCustomerConsentAction } from "@/lib/actions/customer.actions";

interface ConsentState {
  error?: string;
  success?: boolean;
}

export function CustomerConsentForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState<ConsentState, FormData>(updateCustomerConsentAction, {});

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">Communication Preferences</h2>
      <p className="mt-1 text-xs text-muted">
        Controls marketing messages only — updates about your own inquiries, site visits, deals and documents are always sent regardless of these settings.
      </p>

      {state?.error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Preferences saved.
        </div>
      )}

      <div className="mt-4 space-y-3">
        <Toggle name="emailOptIn" label="Email marketing" defaultChecked={customer.emailOptIn} />
        <Toggle name="whatsappOptIn" label="WhatsApp marketing" defaultChecked={customer.whatsappOptIn} />
        <Toggle name="smsOptIn" label="SMS marketing" defaultChecked={customer.smsOptIn} />
        <Toggle name="marketingOptIn" label="General marketing communications" defaultChecked={customer.marketingOptIn} />
      </div>

      <button type="submit" disabled={pending} className="mt-5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {pending ? "Saving..." : "Save Preferences"}
      </button>
    </form>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
      <span className="font-semibold text-ink">{label}</span>
    </label>
  );
}
