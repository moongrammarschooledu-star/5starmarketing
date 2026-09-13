"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conditionRatings, type ConditionRating } from "@/lib/models/maintenance";
import { updateInspectionDetailsAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function InspectionDetailsForm({ inspectionId, overallCondition, notes, recommendations }: { inspectionId: string; overallCondition?: ConditionRating; notes?: string; recommendations?: string }) {
  const [condition, setCondition] = useState<ConditionRating | "">(overallCondition ?? "");
  const [notesText, setNotesText] = useState(notes ?? "");
  const [recommendationsText, setRecommendationsText] = useState(recommendations ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await updateInspectionDetailsAction(inspectionId, { overallCondition: condition || undefined, notes: notesText, recommendations: recommendationsText });
        toast.show("Inspection details saved.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save these details.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Overall Condition</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value as ConditionRating)} className={inputClass}>
            <option value="">Not yet set</option>
            {conditionRatings.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</span>
        <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} className={`${inputClass} min-h-16`} />
      </label>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Recommendations</span>
        <textarea value={recommendationsText} onChange={(e) => setRecommendationsText(e.target.value)} className={`${inputClass} min-h-16`} />
      </label>
      <button type="button" onClick={save} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
        Save Details
      </button>
    </div>
  );
}
