"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { CommunicationSettings } from "@/lib/models/communication";
import { updateCommunicationSettingsAction } from "@/lib/actions/communications.actions";

export function CommunicationSettingsForm({
  settings,
  providers,
}: {
  settings: CommunicationSettings;
  providers: { whatsapp: boolean; email: boolean; sms: boolean };
}) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled);
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [smsEnabled, setSmsEnabled] = useState(settings.smsEnabled);
  const [testMode, setTestMode] = useState(settings.testMode);
  const [businessHoursStart, setBusinessHoursStart] = useState(settings.businessHoursStart);
  const [businessHoursEnd, setBusinessHoursEnd] = useState(settings.businessHoursEnd);
  const [businessHoursTimezone, setBusinessHoursTimezone] = useState(settings.businessHoursTimezone);
  const [deferOutsideBusinessHours, setDeferOutsideBusinessHours] = useState(settings.deferOutsideBusinessHours);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateCommunicationSettingsAction({
          whatsappEnabled,
          emailEnabled,
          smsEnabled,
          testMode,
          businessHoursStart,
          businessHoursEnd,
          businessHoursTimezone,
          deferOutsideBusinessHours,
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
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Communication settings saved.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Provider Status</h2>
        <p className="mt-1 text-xs text-muted">Credentials are configured server-side via environment variables — never entered here. Toggle a channel off to pause it without removing credentials.</p>
        <div className="mt-4 space-y-3">
          <ProviderRow label="WhatsApp Business API" configured={providers.whatsapp} enabled={whatsappEnabled} onToggle={setWhatsappEnabled} />
          <ProviderRow label="Email (SMTP)" configured={providers.email} enabled={emailEnabled} onToggle={setEmailEnabled} />
          <ProviderRow label="SMS" configured={providers.sms} enabled={smsEnabled} onToggle={setSmsEnabled} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Test Mode</h2>
        <p className="mt-1 text-xs text-muted">When on, a clear warning is shown across the composer. Turn this off only once a provider has been tested end-to-end.</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          Test mode enabled
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold text-ink">Business Hours</h2>
        <p className="mt-1 text-xs text-muted">Non-urgent outbound WhatsApp/SMS sends outside this window are deferred to the next opening time, not dropped.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Start</span>
            <input type="time" value={businessHoursStart} onChange={(e) => setBusinessHoursStart(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">End</span>
            <input type="time" value={businessHoursEnd} onChange={(e) => setBusinessHoursEnd(e.target.value)} className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Timezone</span>
            <input type="text" value={businessHoursTimezone} onChange={(e) => setBusinessHoursTimezone(e.target.value)} placeholder="Asia/Karachi" className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={deferOutsideBusinessHours} onChange={(e) => setDeferOutsideBusinessHours(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          Defer non-urgent sends outside business hours
        </label>
      </section>

      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {isPending ? "Saving..." : "Save Communication Settings"}
      </button>
    </div>
  );
}

function ProviderRow({ label, configured, enabled, onToggle }: { label: string; configured: boolean; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className={`text-xs font-bold ${configured ? "text-success" : "text-muted-foreground"}`}>{configured ? "Configured" : "Not configured"}</p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
        Enabled
      </label>
    </div>
  );
}
