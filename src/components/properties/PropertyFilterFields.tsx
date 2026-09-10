"use client";

import { propertyTypes, purposes, propertyStatuses, paymentOptions } from "@/lib/models/property";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6];
const BATHROOM_OPTIONS = [1, 2, 3, 4, 5];

/** Every filter control STEP 16 asks for, in one place — rendered
 *  inside both the desktop filter panel and the mobile drawer so
 *  neither duplicates the field markup. Fully controlled: the parent
 *  owns the "pending" filter state and decides when to apply it (the
 *  keyword box excepted — that one is handled by PropertySearchBar). */
export function PropertyFilterFields({
  value,
  onChange,
  cityOptions,
  amenityOptions,
  projects,
}: {
  value: PropertySearchFilters;
  onChange: (next: PropertySearchFilters) => void;
  cityOptions: string[];
  amenityOptions: string[];
  projects: { id: string; name: string }[];
}) {
  function set<K extends keyof PropertySearchFilters>(key: K, v: PropertySearchFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  function toggleAmenity(a: string) {
    const current = value.amenities ?? [];
    const next = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
    set("amenities", next.length ? next : undefined);
  }

  return (
    <div className="space-y-5">
      <FilterGroup label="Purpose">
        <div className="flex flex-wrap gap-2">
          <Chip active={!value.purpose} onClick={() => set("purpose", undefined)}>
            All
          </Chip>
          {purposes.map((p) => (
            <Chip key={p} active={value.purpose === p} onClick={() => set("purpose", value.purpose === p ? undefined : p)}>
              {p}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Property Type">
        <select
          value={value.type ?? ""}
          onChange={(e) => set("type", (e.target.value || undefined) as PropertySearchFilters["type"])}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
          <option value="">Any Type</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Location">
        <div className="grid grid-cols-2 gap-2.5">
          <select
            value={value.city ?? ""}
            onChange={(e) => set("city", e.target.value || undefined)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          >
            <option value="">Any City</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={value.area ?? ""}
            onChange={(e) => set("area", e.target.value || undefined)}
            placeholder="Area, e.g. Johar Town"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        {projects.length > 0 && (
          <select
            value={value.projectId ?? ""}
            onChange={(e) => set("projectId", e.target.value || undefined)}
            className="mt-2.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          >
            <option value="">Any Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </FilterGroup>

      <FilterGroup label="Price (PKR)">
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            min={0}
            value={value.minPrice ?? ""}
            onChange={(e) => set("minPrice", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Min"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={value.maxPrice ?? ""}
            onChange={(e) => set("maxPrice", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Max"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
      </FilterGroup>

      <FilterGroup label="Size (Sq. Ft.)">
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            min={0}
            value={value.minSize ?? ""}
            onChange={(e) => set("minSize", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Min"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={value.maxSize ?? ""}
            onChange={(e) => set("maxSize", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Max"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
      </FilterGroup>

      <FilterGroup label="Bedrooms">
        <div className="flex flex-wrap gap-2">
          <Chip active={!value.bedrooms} onClick={() => set("bedrooms", undefined)}>
            Any
          </Chip>
          {BEDROOM_OPTIONS.map((n) => (
            <Chip key={n} active={value.bedrooms === n} onClick={() => set("bedrooms", value.bedrooms === n ? undefined : n)}>
              {n}+
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Bathrooms">
        <div className="flex flex-wrap gap-2">
          <Chip active={!value.bathrooms} onClick={() => set("bathrooms", undefined)}>
            Any
          </Chip>
          {BATHROOM_OPTIONS.map((n) => (
            <Chip key={n} active={value.bathrooms === n} onClick={() => set("bathrooms", value.bathrooms === n ? undefined : n)}>
              {n}+
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Status">
        <select
          value={value.status ?? ""}
          onChange={(e) => set("status", (e.target.value || undefined) as PropertySearchFilters["status"])}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
          <option value="">All</option>
          {propertyStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Payment">
        <select
          value={value.paymentOption ?? ""}
          onChange={(e) => set("paymentOption", (e.target.value || undefined) as PropertySearchFilters["paymentOption"])}
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
          <option value="">Any</option>
          {paymentOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <input
            type="number"
            min={0}
            value={value.minDownPayment ?? ""}
            onChange={(e) => set("minDownPayment", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Min Down Payment"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={value.maxDownPayment ?? ""}
            onChange={(e) => set("maxDownPayment", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Max Down Payment"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={value.minMonthlyInstallment ?? ""}
            onChange={(e) => set("minMonthlyInstallment", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Min Monthly Installment"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={value.maxMonthlyInstallment ?? ""}
            onChange={(e) => set("maxMonthlyInstallment", e.target.value ? Math.max(0, Number(e.target.value)) : undefined)}
            placeholder="Max Monthly Installment"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
      </FilterGroup>

      {amenityOptions.length > 0 && (
        <FilterGroup label="Amenities">
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map((a) => (
              <Chip key={a} active={!!value.amenities?.includes(a)} onClick={() => toggleAmenity(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={!!value.featured}
          onChange={(e) => set("featured", e.target.checked || undefined)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        Featured Properties Only
      </label>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "border-2 border-ink/15 text-ink hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}
