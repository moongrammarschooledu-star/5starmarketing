"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { WebsiteSettings } from "@/lib/models/settings";
import { updateMarketingSettingsAction, type SettingsFormState } from "@/lib/actions/settings.actions";

export function MarketingSettingsForm({ settings }: { settings: WebsiteSettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(updateMarketingSettingsAction, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Marketing settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Defaults</h2>
        <p className="mt-1 text-xs text-muted">Used as suggestions only — every campaign&apos;s own UTM fields still take priority.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default UTM Source" name="marketingDefaultUtmSource" defaultValue={settings.marketingDefaultUtmSource} placeholder="facebook" />
          <Field label="Default UTM Medium" name="marketingDefaultUtmMedium" defaultValue={settings.marketingDefaultUtmMedium} placeholder="paid" />
          <Field label="Default Campaign" name="marketingDefaultCampaign" defaultValue={settings.marketingDefaultCampaign} />
          <Field label="Default Landing Page" name="marketingDefaultLandingPage" defaultValue={settings.marketingDefaultLandingPage} placeholder="/properties" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Attribution</h2>
        <div className="mt-4 max-w-xs">
          <Field
            label="Attribution Window (days)"
            name="marketingAttributionWindowDays"
            type="number"
            defaultValue={String(settings.marketingAttributionWindowDays)}
          />
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-muted">
          <p>
            <span className="font-bold text-ink">First-touch:</span> captured once, the first time a visitor arrives with campaign
            parameters. Never overwritten — unless this window has fully elapsed with no conversion, in which case the next
            campaign visit starts a fresh first-touch.
          </p>
          <p>
            <span className="font-bold text-ink">Last-touch:</span> updated on every visit that carries campaign parameters, right up
            until the visitor converts into a lead — at which point both are locked onto that lead permanently.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">WhatsApp Number</h2>
        <p className="mt-1 text-xs text-muted">Shared with Business Information in Website Settings — updating it here updates it everywhere.</p>
        <div className="mt-4 max-w-xs">
          <Field label="WhatsApp Number" name="whatsapp" defaultValue={settings.whatsapp} />
        </div>
      </section>

      <button type="submit" disabled={pending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {pending ? "Saving..." : "Save Marketing Settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}
