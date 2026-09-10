"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { createSavedSearchFromFiltersAction } from "@/lib/actions/customer.actions";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";

/** Integrates with the existing Customer Portal saved-search feature
 *  (STEP 10) — logged-in visitors can name and save the current
 *  advanced-search filter set; guests are sent to login with a
 *  redirect back here, same pattern as FavoriteButton. */
export function SaveSearchButton({ isLoggedIn, filters }: { isLoggedIn: boolean; filters: PropertySearchFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notifyMe, setNotifyMe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleOpen() {
    if (!isLoggedIn) {
      const redirect = `${pathname}?${searchParams.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}&notice=save`);
      return;
    }
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await createSavedSearchFromFiltersAction(name || "My Search", filters, notifyMe);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save this search.");
      return;
    }
    setSaved(true);
    setOpen(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
      >
        <Bookmark className="h-3.5 w-3.5" /> {saved ? "Search Saved!" : "Save Search"}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Name this search</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Johar Town 5 Marla Houses"
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <label className="mt-2.5 flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={notifyMe}
              onChange={(e) => setNotifyMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            Notify me when matching properties are added
          </label>
          {error && <p className="mt-2 text-xs font-semibold text-primary">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Search"}
          </button>
        </div>
      )}
    </div>
  );
}
