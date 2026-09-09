"use client";

import { useTransition } from "react";
import { Trash2, Bell } from "lucide-react";
import type { PropertyAlert } from "@/lib/models/customer";
import { propertyTypes, purposes, locationAreas } from "@/lib/models/property";
import {
  createPropertyAlertAction,
  togglePropertyAlertAction,
  deletePropertyAlertAction,
} from "@/lib/actions/customer.actions";

export function PropertyAlertManager({ alerts }: { alerts: PropertyAlert[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <form
        action={(formData) => startTransition(() => createPropertyAlertAction(formData))}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <h2 className="font-heading text-base font-bold text-ink">Create a Property Alert</h2>
        <p className="mt-1 text-xs text-muted">
          e.g. &quot;I want houses in Lahore under my selected budget.&quot; No email/WhatsApp is sent yet —
          this just saves your preferences.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select name="propertyType" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Any Type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="location" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Any Location</option>
            {locationAreas.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select name="purpose" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Any Purpose</option>
            {purposes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            name="minPrice"
            type="number"
            placeholder="Min budget (PKR)"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            name="maxPrice"
            type="number"
            placeholder="Max budget (PKR)"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Create Alert
          </button>
        </div>
      </form>

      {alerts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">No property alerts yet.</h2>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="min-w-0 text-sm text-ink">
                {[a.propertyType, a.location, a.purpose].filter(Boolean).join(" · ") || "Any property"}
                {(a.minPrice || a.maxPrice) && (
                  <div className="mt-0.5 text-xs text-muted">
                    Budget: {a.minPrice ? `PKR ${a.minPrice.toLocaleString()}` : "Any"} – {a.maxPrice ? `PKR ${a.maxPrice.toLocaleString()}` : "Any"}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) => startTransition(() => togglePropertyAlertAction(a.id, e.target.checked))}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => startTransition(() => deletePropertyAlertAction(a.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                  aria-label="Delete alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
