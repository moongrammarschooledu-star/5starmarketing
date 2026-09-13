"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionEquipment, ConstructionEquipmentInput, EquipmentCategory, EquipmentMaintenanceStatus } from "@/lib/models/construction";
import { equipmentCategories, equipmentMaintenanceStatuses } from "@/lib/models/construction";
import { createEquipmentAction, setEquipmentMaintenanceStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function EquipmentManager({ projectId, equipment }: { projectId: string; equipment: ConstructionEquipment[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionEquipmentInput>>({ category: "Other" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionEquipmentInput>(key: K, value: ConstructionEquipmentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.equipmentName?.trim()) {
      toast.show("Please enter an equipment name.");
      return;
    }
    startTransition(async () => {
      try {
        await createEquipmentAction(projectId, form as ConstructionEquipmentInput);
        toast.show("Equipment added.");
        setForm({ category: "Other" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this equipment.");
      }
    });
  }

  function setStatus(id: string, status: EquipmentMaintenanceStatus) {
    startTransition(async () => {
      try {
        await setEquipmentMaintenanceStatusAction(id, projectId, status);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this equipment.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">Add Equipment</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input placeholder="Equipment Name" value={form.equipmentName ?? ""} onChange={(e) => set("equipmentName", e.target.value)} className={inputClass} />
              <select value={form.category ?? "Other"} onChange={(e) => set("category", e.target.value as EquipmentCategory)} className={inputClass}>
                {equipmentCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input placeholder="Owner / Vendor" value={form.ownerOrVendor ?? ""} onChange={(e) => set("ownerOrVendor", e.target.value)} className={inputClass} />
              <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
              <input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={inputClass} />
              <input type="number" placeholder="Rental Rate" value={form.rentalRate ?? ""} onChange={(e) => set("rentalRate", Number(e.target.value))} className={inputClass} />
              <input placeholder="Notes (optional)" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} sm:col-span-2`} />
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {equipment.map((eq) => (
          <div key={eq.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{eq.equipmentName}</p>
                <p className="text-xs text-muted">
                  {eq.category} {eq.ownerOrVendor ? `· ${eq.ownerOrVendor}` : ""} {eq.rentalRate != null ? `· ${formatPKR(eq.rentalRate)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={eq.maintenanceStatus} />
                <select value={eq.maintenanceStatus} onChange={(e) => setStatus(eq.id, e.target.value as EquipmentMaintenanceStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
                  {equipmentMaintenanceStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {equipment.length === 0 && <p className="text-sm text-muted">No equipment tracked yet.</p>}
      </div>
    </div>
  );
}
