"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MaintenanceSlaSetting } from "@/lib/models/maintenance";
import { updateSlaSettingAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function SlaSettingsManager({ settings }: { settings: MaintenanceSlaSetting[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">SLA Targets</h2>
      <p className="mt-1 text-xs text-muted">Configurable response/resolution targets per priority — never a hardcoded business promise. Used to compute each request&apos;s SLA due-by timestamps.</p>
      <div className="mt-4 space-y-2">
        {settings.map((s) => (
          <SlaRow key={s.priority} setting={s} />
        ))}
      </div>
    </section>
  );
}

function SlaRow({ setting }: { setting: MaintenanceSlaSetting }) {
  const [responseMinutes, setResponseMinutes] = useState(setting.responseMinutes);
  const [resolutionMinutes, setResolutionMinutes] = useState(setting.resolutionMinutes);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await updateSlaSettingAction(setting.priority, { responseMinutes, resolutionMinutes, active: setting.active });
        toast.show(`${setting.priority} SLA saved.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this SLA setting.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <span className="w-24 text-sm font-bold text-ink">{setting.priority}</span>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Response (min)
        <input type="number" value={responseMinutes} onChange={(e) => setResponseMinutes(Number(e.target.value))} className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-primary" />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Resolution (min)
        <input type="number" value={resolutionMinutes} onChange={(e) => setResolutionMinutes(Number(e.target.value))} className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-primary" />
      </label>
      <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Save
      </button>
    </div>
  );
}
