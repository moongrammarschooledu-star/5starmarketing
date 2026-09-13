"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProgressUpdateType } from "@/lib/models/construction";
import { recordProgressUpdateAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ProgressUpdateForm({ projectId, phases }: { projectId: string; phases: { id: string; name: string }[] }) {
  const [updateType, setUpdateType] = useState<ProgressUpdateType>("OVERALL");
  const [referenceId, setReferenceId] = useState("");
  const [actualPercent, setActualPercent] = useState("");
  const [plannedPercent, setPlannedPercent] = useState("");
  const [notes, setNotes] = useState("");
  const [customerVisible, setCustomerVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    startTransition(async () => {
      try {
        await recordProgressUpdateAction(projectId, {
          updateType,
          referenceId: updateType === "PHASE" ? referenceId || undefined : undefined,
          actualPercent: actualPercent ? Number(actualPercent) : undefined,
          plannedPercent: plannedPercent ? Number(plannedPercent) : undefined,
          notes: notes || undefined,
          customerVisible,
        });
        toast.show("Progress update recorded.");
        setActualPercent("");
        setNotes("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this update.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-base font-bold text-ink">Record Progress Update</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Type</span>
          <select value={updateType} onChange={(e) => setUpdateType(e.target.value as ProgressUpdateType)} className={`${inputClass} w-full`}>
            <option value="OVERALL">Overall</option>
            <option value="PHASE">Phase</option>
          </select>
        </label>
        {updateType === "PHASE" && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Phase</span>
            <select value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className={`${inputClass} w-full`}>
              <option value="">Select phase</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Actual %</span>
          <input type="number" value={actualPercent} onChange={(e) => setActualPercent(e.target.value)} className={`${inputClass} w-full`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Planned % (optional override)</span>
          <input type="number" value={plannedPercent} onChange={(e) => setPlannedPercent(e.target.value)} className={`${inputClass} w-full`} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-16 w-full`} />
      </label>
      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink">
        <input type="checkbox" checked={customerVisible} onChange={(e) => setCustomerVisible(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
        Show this update in the customer portal
      </label>
      <button type="button" onClick={submit} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Record Update
      </button>
    </div>
  );
}
