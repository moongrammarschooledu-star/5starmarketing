"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PropertyCard } from "./PropertyCard";
import {
  properties,
  propertyTypes,
  purposes,
  locationAreas,
  sizeCategories,
  paymentOptions,
  priceRanges,
  type PropertyType,
  type Purpose,
  type LocationArea,
  type SizeCategory,
  type PaymentOption,
} from "@/lib/data/properties";

const ALL = "All";

interface FilterState {
  type: PropertyType | typeof ALL;
  purpose: Purpose | typeof ALL;
  locationArea: LocationArea | typeof ALL;
  sizeCategory: SizeCategory | typeof ALL;
  priceRange: string;
  paymentOption: PaymentOption | typeof ALL;
}

const defaultFilters: FilterState = {
  type: ALL,
  purpose: ALL,
  locationArea: ALL,
  sizeCategory: ALL,
  priceRange: priceRanges[0].label,
  paymentOption: ALL,
};

export function PropertiesBrowser() {
  const [pending, setPending] = useState<FilterState>(defaultFilters);
  const [applied, setApplied] = useState<FilterState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const range = priceRanges.find((r) => r.label === applied.priceRange) ?? priceRanges[0];

    return properties.filter((p) => {
      if (applied.type !== ALL && p.type !== applied.type) return false;
      if (applied.purpose !== ALL && p.purpose !== applied.purpose) return false;
      if (applied.locationArea !== ALL && p.locationArea !== applied.locationArea) return false;
      if (applied.sizeCategory !== ALL && p.sizeCategory !== applied.sizeCategory) return false;
      if (applied.paymentOption !== ALL && !p.paymentOption.includes(applied.paymentOption))
        return false;
      if (range.label !== "Any Budget") {
        if (p.priceValue === undefined) return false;
        if (p.priceValue < range.min || p.priceValue >= range.max) return false;
      }
      return true;
    });
  }, [applied]);

  function handleSearch() {
    setApplied(pending);
    setFiltersOpen(false);
  }

  function handleReset() {
    setPending(defaultFilters);
    setApplied(defaultFilters);
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-bold text-ink lg:hidden"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
          </span>
          {filtersOpen ? <X className="h-4 w-4" /> : <span className="text-primary">Show</span>}
        </button>

        <div
          className={`${filtersOpen ? "mt-4 grid" : "hidden"} grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-0 lg:grid lg:grid-cols-6`}
        >
          <Filter
            label="Property Type"
            value={pending.type}
            onChange={(v) => setPending((f) => ({ ...f, type: v as FilterState["type"] }))}
            options={[ALL, ...propertyTypes]}
          />
          <Filter
            label="Purpose"
            value={pending.purpose}
            onChange={(v) => setPending((f) => ({ ...f, purpose: v as FilterState["purpose"] }))}
            options={[ALL, ...purposes]}
          />
          <Filter
            label="Location"
            value={pending.locationArea}
            onChange={(v) =>
              setPending((f) => ({ ...f, locationArea: v as FilterState["locationArea"] }))
            }
            options={[ALL, ...locationAreas]}
          />
          <Filter
            label="Size"
            value={pending.sizeCategory}
            onChange={(v) =>
              setPending((f) => ({ ...f, sizeCategory: v as FilterState["sizeCategory"] }))
            }
            options={[ALL, ...sizeCategories]}
          />
          <Filter
            label="Price Range"
            value={pending.priceRange}
            onChange={(v) => setPending((f) => ({ ...f, priceRange: v }))}
            options={priceRanges.map((r) => r.label)}
          />
          <Filter
            label="Payment"
            value={pending.paymentOption}
            onChange={(v) =>
              setPending((f) => ({ ...f, paymentOption: v as FilterState["paymentOption"] }))
            }
            options={[ALL, ...paymentOptions]}
          />
        </div>

        <div className={`${filtersOpen ? "flex" : "hidden"} mt-4 gap-3 lg:flex`}>
          <button
            type="button"
            onClick={handleSearch}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover sm:flex-none"
          >
            <Search className="h-4 w-4" /> Search Properties
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-muted">
        Showing {results.length} of {properties.length} demo {properties.length === 1 ? "listing" : "listings"}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-ink">No demo properties match those filters</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Contact us on WhatsApp and we&apos;ll help you find the right property
            from our full inventory.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

function Filter<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition-colors focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
