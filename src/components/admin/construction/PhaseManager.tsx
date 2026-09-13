"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { ConstructionPhase, ConstructionPhaseInput, PhaseStatus } from "@/lib/models/construction";
import { phaseStatuses, SUGGESTED_PHASE_NAMES } from "@/lib/models/construction";
import { createPhaseAction, updatePhaseAction } from "@/lib/actions/construction.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function PhaseManager({ projectId, phases, staff }: { projectId: string; phases: ConstructionPhase[]; staff: { id: string; name: string }[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ConstructionPhaseInput>>({ sequence: phases.length + 1 });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set<K extends keyof ConstructionPhaseInput>(key: K, value: ConstructionPhaseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function create() {
    if (!form.name?.trim()) {
      toast.show("Please enter a phase name.");
      return;
    }
    startTransition(async () => {
      try {
        await createPhaseAction(projectId, form as ConstructionPhaseInput);
        toast.show("Phase created.");
        setForm({ sequence: phases.length + 2 });
        setShowForm(false);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this phase.");
      }
    });
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <button type="button" onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="font-heading text-base font-bold text-ink">Add Phase</span>
          {showForm ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>
        {showForm && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Name</span>
                <input list="phase-names" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={`${inputClass} w-full`} />
                <datalist id="phase-names">
                  {SUGGESTED_PHASE_NAMES.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Sequence</span>
                <input type="number" value={form.sequence ?? 1} onChange={(e) => set("sequence", Number(e.target.value))} className={`${inputClass} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Weight (%, of overall project)</span>
                <input type="number" value={form.weight ?? ""} onChange={(e) => set("weight", Number(e.target.value))} className={`${inputClass} w-full`} placeholder="Leave blank for equal weighting" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Responsible Person</span>
                <select value={form.responsiblePersonId ?? ""} onChange={(e) => set("responsiblePersonId", e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Planned Start</span>
                <input type="date" value={form.plannedStart ?? ""} onChange={(e) => set("plannedStart", e.target.value)} className={`${inputClass} w-full`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Planned Finish</span>
                <input type="date" value={form.plannedFinish ?? ""} onChange={(e) => set("plannedFinish", e.target.value)} className={`${inputClass} w-full`} />
              </label>
            </div>
            <button type="button" onClick={create} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add Phase
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {phases.map((phase) => (
          <PhaseRow key={phase.id} projectId={projectId} phase={phase} />
        ))}
        {phases.length === 0 && <p className="text-sm text-muted">No phases yet.</p>}
      </div>
    </div>
  );
}

function PhaseRow({ projectId, phase }: { projectId: string; phase: ConstructionPhase }) {
  const [progress, setProgress] = useState(phase.progress);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function saveProgress() {
    startTransition(async () => {
      try {
        await updatePhaseAction(phase.id, projectId, { progress });
        toast.show("Progress updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this phase.");
      }
    });
  }

  function setStatus(status: PhaseStatus) {
    startTransition(async () => {
      try {
        const extra: { status: PhaseStatus; actualStart?: string; actualFinish?: string } = { status };
        if (status === "IN_PROGRESS" && !phase.actualStart) extra.actualStart = new Date().toISOString().slice(0, 10);
        if (status === "COMPLETED") {
          extra.actualFinish = new Date().toISOString().slice(0, 10);
          setProgress(100);
          await updatePhaseAction(phase.id, projectId, { ...extra, progress: 100 });
        } else {
          await updatePhaseAction(phase.id, projectId, extra);
        }
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this phase.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            {phase.sequence}. {phase.name}
          </p>
          <p className="text-xs text-muted">
            Weight: {phase.weight}% {phase.responsiblePersonName ? `· ${phase.responsiblePersonName}` : ""}
          </p>
        </div>
        <StatusBadge status={phase.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} onMouseUp={saveProgress} onTouchEnd={saveProgress} className="w-32" />
          <span className="text-xs font-bold text-ink">{progress}%</span>
        </div>
        <select value={phase.status} onChange={(e) => setStatus(e.target.value as PhaseStatus)} disabled={isPending} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary">
          {phaseStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
