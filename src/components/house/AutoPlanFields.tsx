"use client";

import type { AutoSpec } from "@/lib/house/autoLayout";

/** The room wishes of an automatic plan (the plot, floors and floor height come from elsewhere). */
export type AutoCounts = Omit<AutoSpec, "width" | "length" | "floors" | "floorHeight">;

const selectClass = "w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary";

function Count({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={selectClass}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
      {label}
    </label>
  );
}

export function AutoPlanFields({ value, onChange }: { value: AutoCounts; onChange: (next: AutoCounts) => void }) {
  const set = <K extends keyof AutoCounts>(key: K, v: AutoCounts[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <Count label="Bedrooms" value={value.bedrooms} max={8} onChange={(n) => set("bedrooms", n)} />
        <Count label="Bathrooms" value={value.bathrooms} max={10} onChange={(n) => set("bathrooms", n)} />
        <Count label="Kitchens" value={value.kitchens} max={2} onChange={(n) => set("kitchens", n)} />
        <Count label="TV Lounges" value={value.lounges} max={2} onChange={(n) => set("lounges", n)} />
        <Count label="Stores" value={value.stores} max={3} onChange={(n) => set("stores", n)} />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Check label="Drawing room" checked={value.drawing} onChange={(b) => set("drawing", b)} />
        <Check label="Dining room" checked={value.dining} onChange={(b) => set("dining", b)} />
        <Check label="Prayer room" checked={value.prayer} onChange={(b) => set("prayer", b)} />
        <Check label="Study / office" checked={value.study} onChange={(b) => set("study", b)} />
        <Check label="Porch" checked={value.porch} onChange={(b) => set("porch", b)} />
        <Check label="Front lawn" checked={value.lawn} onChange={(b) => set("lawn", b)} />
        <Check label="Garage" checked={value.garage} onChange={(b) => set("garage", b)} />
      </div>
    </div>
  );
}
