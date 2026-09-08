"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PropertyCard } from "./PropertyCard";
import {
  properties,
  propertyTypes,
  purposes,
  locations,
  budgetRanges,
  type PropertyType,
  type Purpose,
} from "@/lib/data/properties";

const ALL = "All";

export function PropertiesSection() {
  const [type, setType] = useState<PropertyType | typeof ALL>(ALL);
  const [purpose, setPurpose] = useState<Purpose | typeof ALL>(ALL);
  const [location, setLocation] = useState<string>(ALL);
  const [budget, setBudget] = useState<string>(budgetRanges[0]);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (type !== ALL && p.type !== type) return false;
      if (purpose !== ALL && p.purpose !== purpose) return false;
      if (location !== ALL && !p.location.includes(location)) return false;
      return true;
    });
  }, [type, purpose, location]);

  return (
    <section id="properties" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow="Property Discovery"
          title="Find Your Next"
          highlight="Property"
          description="Browse a sample of the kind of houses, flats, plots and commercial properties we help clients buy, sell and invest in. This section is easy to update with live listings."
        />

        <div className="mt-10 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-muted p-4 sm:grid-cols-4 sm:p-5">
          <Filter label="Property Type" value={type} onChange={setType} options={[ALL, ...propertyTypes]} />
          <Filter label="Purpose" value={purpose} onChange={setPurpose} options={[ALL, ...purposes]} />
          <Filter label="Location" value={location} onChange={setLocation} options={[ALL, ...locations]} />
          <Filter label="Budget" value={budget} onChange={setBudget} options={budgetRanges} />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-ink">No demo properties match those filters yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Contact us on WhatsApp and we&apos;ll help you find the right property
              from our full inventory.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
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
