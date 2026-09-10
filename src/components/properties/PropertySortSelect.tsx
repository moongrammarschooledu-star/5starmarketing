"use client";

import { propertySortOptions, type PropertySortKey } from "@/lib/models/propertySearch";

export function PropertySortSelect({ value, onChange }: { value: PropertySortKey; onChange: (v: PropertySortKey) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-semibold text-ink sm:inline">Sort By</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PropertySortKey)}
        aria-label="Sort properties"
        className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
      >
        {propertySortOptions.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
