"use client";

import { X } from "lucide-react";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";

function formatPKRShort(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)} Crore`;
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} Lac`;
  return n.toLocaleString("en-US");
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Builds one removable chip per active, human-meaningful filter — not
 *  a 1:1 mirror of the raw filter object (bounds/page/sort don't get a
 *  chip; they're map/pagination/ordering state, not "what am I
 *  filtering for"). */
export function ActiveFilterChips({
  filters,
  onChange,
  onClearAll,
}: {
  filters: PropertySearchFilters;
  onChange: (next: PropertySearchFilters) => void;
  onClearAll: () => void;
}) {
  const chips: Chip[] = [];
  const clear = (patch: Partial<PropertySearchFilters>) => onChange({ ...filters, ...patch });

  if (filters.q) chips.push({ key: "q", label: `"${filters.q}"`, onRemove: () => clear({ q: undefined }) });
  if (filters.purpose) chips.push({ key: "purpose", label: filters.purpose, onRemove: () => clear({ purpose: undefined }) });
  if (filters.type) chips.push({ key: "type", label: filters.type, onRemove: () => clear({ type: undefined }) });
  if (filters.city) chips.push({ key: "city", label: filters.city, onRemove: () => clear({ city: undefined }) });
  if (filters.area) chips.push({ key: "area", label: filters.area, onRemove: () => clear({ area: undefined }) });
  if (filters.status) chips.push({ key: "status", label: filters.status, onRemove: () => clear({ status: undefined }) });
  if (filters.paymentOption) chips.push({ key: "payment", label: filters.paymentOption, onRemove: () => clear({ paymentOption: undefined }) });
  if (filters.bedrooms) chips.push({ key: "bedrooms", label: `${filters.bedrooms}+ Bedrooms`, onRemove: () => clear({ bedrooms: undefined }) });
  if (filters.bathrooms) chips.push({ key: "bathrooms", label: `${filters.bathrooms}+ Bathrooms`, onRemove: () => clear({ bathrooms: undefined }) });
  if (filters.featured) chips.push({ key: "featured", label: "Featured", onRemove: () => clear({ featured: undefined }) });

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice !== undefined ? `PKR ${formatPKRShort(filters.minPrice)}` : "Any";
    const max = filters.maxPrice !== undefined ? `PKR ${formatPKRShort(filters.maxPrice)}` : "Any";
    chips.push({ key: "price", label: `${min} – ${max}`, onRemove: () => clear({ minPrice: undefined, maxPrice: undefined }) });
  }
  if (filters.minSize !== undefined || filters.maxSize !== undefined) {
    const min = filters.minSize !== undefined ? `${filters.minSize.toLocaleString()} sqft` : "Any";
    const max = filters.maxSize !== undefined ? `${filters.maxSize.toLocaleString()} sqft` : "Any";
    chips.push({ key: "size", label: `${min} – ${max}`, onRemove: () => clear({ minSize: undefined, maxSize: undefined }) });
  }
  for (const a of filters.amenities ?? []) {
    chips.push({
      key: `amenity:${a}`,
      label: a,
      onRemove: () => clear({ amenities: (filters.amenities ?? []).filter((x) => x !== a) }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          {c.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="text-xs font-bold text-muted underline hover:text-primary">
        Clear All Filters
      </button>
    </div>
  );
}
