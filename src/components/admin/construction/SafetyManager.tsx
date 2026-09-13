"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionSafetyRecord, ConstructionSafetyRecordInput, SafetyRecordType, SafetyStatus } from "@/lib/models/construction";
import { safetyRecordTypes, safetyStatuses } from "@/lib/models/construction";
import { createSafetyRecordAction, updateSafetyStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function SafetyManager({ projectId, records, staff }: { projectId: string; records: ConstructionSafetyRecord[]; staff: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionSafetyRecordInput>>({ recordType: "INSPECTION" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionSafetyRecordInput>(key: K, value: ConstructionSafetyRecordInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.description?.trim()) {
      toast.show("Please describe this safety record.");
      return;
    }
    startTransition(async () => {
      try {
        await createSafetyRecordAction(projectId, form as ConstructionSafetyRecordInput);
        toast.show("Safety record created.");
        setForm({ recordType: "INSPECTION" });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this record.");
      }
    });
  }

  function setStatus(id: string, status: SafetyStatus) {
    startTransition(async () => {
      await updateSafetyStatusAction(id, projectId, status);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">New Safety Record</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select value={form.recordType ?? "INSPECTION"} onChange={(e) => set("recordType", e.target.value as SafetyRecordType)} className={inputClass}>
                {safetyRecordTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input type="date" value={form.recordDate ?? ""} onChange={(e) => set("recordDate", e.target.value)} className={inputClass} />
              <select value={form.responsiblePersonId ?? ""} onChange={(e) => set("responsiblePersonId", e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <textarea placeholder="Description" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} className={`${inputClass} min-h-16 sm:col-span-3`} />
              <input placeholder="Corrective Action (optional)" value={form.correctiveAction ?? ""} onChange={(e) => set("correctiveAction", e.target.value)} className={`${inputClass} sm:col-span-2`} />
              <input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} className={inputClass} />
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Record
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {records.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{r.recordType.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted">
                  {new Date(r.recordDate).toLocaleDateString("en-GB")} {r.reportedByName ? `· Reported by ${r.reportedByName}` : ""} {r.responsiblePersonName ? `· Assigned to ${r.responsiblePersonName}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">{r.description}</p>
                {r.correctiveAction && <p className="mt-1 text-xs text-muted">Corrective action: {r.correctiveAction}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as SafetyStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
                  {safetyStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-muted">No safety records yet.</p>}
      </div>
    </div>
  );
}
