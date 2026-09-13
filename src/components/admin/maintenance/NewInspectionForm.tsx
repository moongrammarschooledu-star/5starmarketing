"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inspectionTypes, type InspectionType } from "@/lib/models/maintenance";
import { createInspectionAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function NewInspectionForm({ properties, staff }: { properties: { id: string; title: string }[]; staff: { id: string; name: string }[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [inspectionType, setInspectionType] = useState<InspectionType>("ROUTINE");
  const [inspectorId, setInspectorId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!propertyId) {
      toast.show("Please select a property.");
      return;
    }
    startTransition(async () => {
      try {
        const inspection = await createInspectionAction({ propertyId, inspectionType, inspectorId: inspectorId || undefined, scheduledDate: scheduledDate || undefined, notes: notes || undefined });
        toast.show("Inspection created.");
        router.push(`/admin/inspections/${inspection.id}`);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this inspection.");
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
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Inspection Type</span>
          <select value={inspectionType} onChange={(e) => setInspectionType(e.target.value as InspectionType)} className={inputClass}>
            {inspectionTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Inspector</span>
          <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Scheduled Date</span>
        <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-20`} />
      </label>
      <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {isPending ? "Creating..." : "Create Inspection"}
      </button>
    </div>
  );
}
