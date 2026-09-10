"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { InventoryUnitType, InventoryAreaUnit } from "@/lib/models/inventory";
import { inventoryUnitTypes, inventoryAreaUnits } from "@/lib/models/inventory";
import { createInventoryUnitAction } from "@/lib/actions/inventory.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function InventoryForm({ projects, properties, defaultProjectId }: { projects: { id: string; name: string }[]; properties: { id: string; title: string }[]; defaultProjectId?: string }) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [propertyId, setPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [block, setBlock] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [unitType, setUnitType] = useState<InventoryUnitType>("Flat");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState<InventoryAreaUnit>("Sq Ft");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    setError(null);
    if (!unitNumber.trim()) {
      setError("Unit number is required.");
      return;
    }
    startTransition(async () => {
      try {
        const unit = await createInventoryUnitAction({
          projectId: projectId || undefined,
          propertyId: propertyId || undefined,
          unitNumber: unitNumber.trim(),
          block: block || undefined,
          building: building || undefined,
          floor: floor || undefined,
          unitType,
          area: area ? Number(area) : undefined,
          areaUnit,
          price: price ? Number(price) : undefined,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
        });
        toast.show(`${unit.unitNumber} created.`);
        router.push(`/admin/inventory/${unit.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create this inventory unit.");
      }
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Project</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Property</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            <option value="">None</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Unit Number *</span>
          <input type="text" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="A-101" className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Type *</span>
          <select value={unitType} onChange={(e) => setUnitType(e.target.value as InventoryUnitType)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
            {inventoryUnitTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Block</span>
          <input type="text" value={block} onChange={(e) => setBlock(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Building</span>
          <input type="text" value={building} onChange={(e) => setBuilding(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Floor</span>
          <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Area</span>
            <input type="number" min={0} value={area} onChange={(e) => setArea(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Unit</span>
            <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as InventoryAreaUnit)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary">
              {inventoryAreaUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Price (PKR)</span>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Bedrooms</span>
          <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">Bathrooms</span>
          <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary" />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create Inventory Unit"}
      </button>
    </div>
  );
}
