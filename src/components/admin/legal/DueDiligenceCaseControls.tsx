"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DueDiligenceCase, DueDiligenceStatus } from "@/lib/models/legal";
import { DUE_DILIGENCE_ALLOWED_TRANSITIONS } from "@/lib/models/legal";
import { updateDueDiligenceStatusAction, assignDueDiligenceOfficerAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function DueDiligenceCaseControls({ dueDiligenceCase, officers, canManage }: { dueDiligenceCase: DueDiligenceCase; officers: { id: string; name: string }[]; canManage: boolean }) {
  const [officerId, setOfficerId] = useState(dueDiligenceCase.legalOfficerId ?? "");
  const [outcomeSummary, setOutcomeSummary] = useState(dueDiligenceCase.outcomeSummary ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const nextStatuses = DUE_DILIGENCE_ALLOWED_TRANSITIONS[dueDiligenceCase.status] ?? [];

  function setStatus(status: DueDiligenceStatus) {
    startTransition(async () => {
      try {
        await updateDueDiligenceStatusAction(dueDiligenceCase.id, status, dueDiligenceCase.legalOfficerId, { outcomeSummary: outcomeSummary || undefined });
        toast.show(`Status set to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this case.");
      }
    });
  }

  function assignOfficer() {
    startTransition(async () => {
      try {
        await assignDueDiligenceOfficerAction(dueDiligenceCase.id, officerId || null);
        toast.show("Officer updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not assign an officer.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Legal Officer</span>
          <select value={officerId} onChange={(e) => setOfficerId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={assignOfficer} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
            Save
          </button>
        </div>
      )}

      <div className="mt-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Outcome Summary (only when authorized to conclude)</span>
        <textarea value={outcomeSummary} onChange={(e) => setOutcomeSummary(e.target.value)} rows={2} className={`mt-1 w-full ${inputClass}`} />
      </div>

      {nextStatuses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <button key={s} type="button" disabled={isPending} onClick={() => setStatus(s)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
              Move to {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
