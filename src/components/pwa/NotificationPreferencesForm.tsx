"use client";

import { useState, useTransition } from "react";
import { updateMyMobilePreferencesAction } from "@/lib/actions/mobile.actions";
import type { MobileAppPreferences } from "@/lib/models/mobile";

const CATEGORIES: { key: keyof MobileAppPreferences; label: string }[] = [
  { key: "notifyProperty", label: "Property updates" },
  { key: "notifyAppointment", label: "Appointments & site visits" },
  { key: "notifyPayment", label: "Payments & deals" },
  { key: "notifyRental", label: "Rental" },
  { key: "notifyMaintenance", label: "Maintenance" },
  { key: "notifySupport", label: "Support tickets" },
  { key: "notifyLegal", label: "Legal & documents" },
  { key: "notifyMarketing", label: "Offers & marketing" },
  { key: "notifySystem", label: "System announcements" },
];

export function NotificationPreferencesForm({ initial }: { initial: MobileAppPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof MobileAppPreferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaved(false);
    startTransition(async () => {
      await updateMyMobilePreferencesAction({ [key]: value });
      setSaved(true);
    });
  }

  return (
    <div>
      <label className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
        <span className="text-sm font-bold text-ink">Push notifications enabled</span>
        <input
          type="checkbox"
          checked={prefs.pushEnabled}
          onChange={(e) => toggle("pushEnabled", e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
      </label>

      <div className="mt-3 space-y-2">
        {CATEGORIES.map((c) => (
          <label
            key={c.key}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5"
          >
            <span className="text-sm text-ink">{c.label}</span>
            <input
              type="checkbox"
              checked={!!prefs[c.key]}
              disabled={!prefs.pushEnabled}
              onChange={(e) => toggle(c.key, e.target.checked)}
              className="h-4.5 w-4.5 accent-primary disabled:opacity-40"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{pending ? "Saving…" : saved ? "Saved." : ""}</p>
    </div>
  );
}
