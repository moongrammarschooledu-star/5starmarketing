"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { conditionRatings, severities, type ConditionRating, type Severity, type InspectionResult } from "@/lib/models/maintenance";
import { updateInspectionResultAction, createDefectAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

const CONDITION_STYLE: Record<ConditionRating, string> = {
  GOOD: "bg-green-100 text-green-800",
  FAIR: "bg-amber-100 text-amber-800",
  POOR: "bg-orange-100 text-orange-800",
  DAMAGED: "bg-red-100 text-red-800",
  NOT_INSPECTED: "bg-gray-100 text-gray-600",
  NOT_APPLICABLE: "bg-gray-100 text-gray-500",
};

export function InspectionChecklist({ inspectionId, propertyId, results }: { inspectionId: string; propertyId: string; results: InspectionResult[] }) {
  const grouped = new Map<string, InspectionResult[]>();
  for (const r of results) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  return (
    <div className="mt-3 space-y-4">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category} className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{category}</p>
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <ChecklistRow key={item.id} inspectionId={inspectionId} propertyId={propertyId} item={item} />
            ))}
          </div>
        </div>
      ))}
      {results.length === 0 && <p className="text-sm text-muted">No checklist items on this inspection.</p>}
    </div>
  );
}

function ChecklistRow({ inspectionId, propertyId, item }: { inspectionId: string; propertyId: string; item: InspectionResult }) {
  const [condition, setCondition] = useState<ConditionRating>(item.condition);
  const [severity, setSeverity] = useState<Severity | "">(item.severity ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [defectDescription, setDefectDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save(nextCondition = condition, nextSeverity = severity, nextNotes = notes) {
    startTransition(async () => {
      try {
        await updateInspectionResultAction(item.id, { condition: nextCondition, severity: nextSeverity || undefined, notes: nextNotes || undefined });
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save this item.");
      }
    });
  }

  function raiseDefect() {
    if (!defectDescription.trim()) {
      toast.show("Please describe the defect.");
      return;
    }
    startTransition(async () => {
      try {
        await createDefectAction({
          propertyId,
          inspectionId,
          checklistResultId: item.id,
          category: item.category,
          description: defectDescription.trim(),
          severity: (severity || "MEDIUM") as Severity,
        });
        toast.show("Defect raised.");
        setShowDefectForm(false);
        setDefectDescription("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not raise this defect.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-[140px] flex-1 text-sm font-medium text-ink">{item.item}</span>
        <select
          value={condition}
          onChange={(e) => {
            const v = e.target.value as ConditionRating;
            setCondition(v);
            save(v, severity, notes);
          }}
          className={`${inputClass} ${CONDITION_STYLE[condition]}`}
        >
          {conditionRatings.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => {
            const v = e.target.value as Severity;
            setSeverity(v);
            save(condition, v, notes);
          }}
          className={inputClass}
        >
          <option value="">No severity</option>
          {severities.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowDefectForm((v) => !v)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <AlertTriangle className="h-3.5 w-3.5" /> Raise Defect
        </button>
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save(condition, severity, notes)} placeholder="Notes..." className={`${inputClass} mt-2 w-full`} disabled={isPending} />
      {showDefectForm && (
        <div className="mt-2 rounded-lg bg-surface-muted p-2.5">
          <textarea value={defectDescription} onChange={(e) => setDefectDescription(e.target.value)} placeholder="Describe the defect and recommended action..." className={`${inputClass} min-h-14 w-full`} />
          <button type="button" onClick={raiseDefect} disabled={isPending} className="mt-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
            Create Defect
          </button>
        </div>
      )}
    </div>
  );
}
