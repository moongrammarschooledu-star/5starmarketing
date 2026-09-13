"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ConstructionMilestone, ConstructionMilestoneInput, MilestoneStatus } from "@/lib/models/construction";
import { milestoneStatuses, SUGGESTED_MILESTONE_NAMES } from "@/lib/models/construction";
import { createMilestoneAction, updateMilestoneStatusAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function MilestoneManager({ projectId, milestones, phases }: { projectId: string; milestones: ConstructionMilestone[]; phases: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    if (!name.trim()) {
      toast.show("Please enter a milestone name.");
      return;
    }
    startTransition(async () => {
      try {
        const input: ConstructionMilestoneInput = { name: name.trim(), phaseId: phaseId || undefined, plannedDate: plannedDate || undefined };
        await createMilestoneAction(projectId, input);
        toast.show("Milestone created.");
        setName("");
        setPlannedDate("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this milestone.");
      }
    });
  }

  function setStatus(id: string, status: MilestoneStatus) {
    startTransition(async () => {
      await updateMilestoneStatusAction(id, projectId, status);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input list="milestone-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone name" className={`${inputClass} min-w-[180px] flex-1`} />
        <datalist id="milestone-names">
          {SUGGESTED_MILESTONE_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputClass}>
          <option value="">No phase</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={inputClass} />
        <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">{m.name}</p>
              <p className="text-xs text-muted">
                {m.phaseName ? `${m.phaseName} · ` : ""}
                {m.plannedDate ? `Planned ${new Date(m.plannedDate).toLocaleDateString("en-GB")}` : "No planned date"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={m.status} />
              <select value={m.status} onChange={(e) => setStatus(m.id, e.target.value as MilestoneStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary">
                {milestoneStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {milestones.length === 0 && <p className="text-sm text-muted">No milestones yet.</p>}
      </div>
    </div>
  );
}
