"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { maintenanceCategories, maintenancePriorities, type MaintenanceCategory, type MaintenancePriority } from "@/lib/models/maintenance";
import { createMaintenanceRequestAdminAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewMaintenanceRequestForm({ properties }: { properties: { id: string; title: string }[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [category, setCategory] = useState<MaintenanceCategory>("Other");
  const [priority, setPriority] = useState<MaintenancePriority>("NORMAL");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!propertyId || !description.trim()) {
      toast.show("Please select a property and enter a description.");
      return;
    }
    startTransition(async () => {
      try {
        const request = await createMaintenanceRequestAdminAction({ propertyId, category, priority, description: description.trim() });
        toast.show("Request created.");
        router.push(`/admin/maintenance/requests/${request.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this request.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-5">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Property</span>
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as MaintenanceCategory)} className={inputClass}>
            {maintenanceCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} className={inputClass}>
            {maintenancePriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-24`} />
      </label>
      <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isPending ? "Creating..." : "Create Request"}
      </button>
    </div>
  );
}
