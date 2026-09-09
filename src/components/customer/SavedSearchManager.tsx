"use client";

import { useTransition } from "react";
import { Trash2, BookmarkCheck } from "lucide-react";
import type { SavedSearch } from "@/lib/models/customer";
import { propertyTypes, purposes, sizeCategories, locationAreas } from "@/lib/models/property";
import {
  createSavedSearchAction,
  toggleSavedSearchAction,
  deleteSavedSearchAction,
} from "@/lib/actions/customer.actions";

export function SavedSearchManager({ searches }: { searches: SavedSearch[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <form
        action={(formData) => startTransition(() => createSavedSearchAction(formData))}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <h2 className="font-heading text-base font-bold text-ink">Save a Search</h2>
        <p className="mt-1 text-xs text-muted">e.g. House, Lahore, 5 Marla, Sale</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input
            name="name"
            required
            placeholder="Name this search"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary sm:col-span-5"
          />
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
          <select name="sizeCategory" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Any Size</option>
            {sizeCategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="purpose" defaultValue="" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">Any Purpose</option>
            {purposes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Save Search
          </button>
        </div>
      </form>

      {searches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center">
          <BookmarkCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">
            Save a search to quickly find properties that match your requirements.
          </h2>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {searches.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="min-w-0">
                <div className="font-bold text-ink">{s.name}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {[s.propertyType, s.location, s.sizeCategory, s.purpose].filter(Boolean).join(" · ") || "Any property"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => startTransition(() => toggleSavedSearchAction(s.id, e.target.checked))}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => startTransition(() => deleteSavedSearchAction(s.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                  aria-label="Delete search"
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
