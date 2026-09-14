"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalChecklistResult, ChecklistResultStatus, ChecklistResultSubjectType, DueDiligenceCompletionScore } from "@/lib/models/legal";
import { checklistResultStatuses } from "@/lib/models/legal";
import { recordChecklistResultAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary";

export function ChecklistResultManager({
  subjectType,
  subjectId,
  results,
  score,
  officerId,
  canManage,
}: {
  subjectType: ChecklistResultSubjectType;
  subjectId: string;
  results: LegalChecklistResult[];
  score?: DueDiligenceCompletionScore;
  officerId?: string;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(templateItemId: string, status: ChecklistResultStatus) {
    startTransition(async () => {
      try {
        await recordChecklistResultAction({ subjectType, subjectId, templateItemId, status }, officerId);
        toast.show("Checklist result recorded.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this result.");
      }
    });
  }

  if (results.length === 0) return <p className="mt-3 text-sm text-muted">No checklist template assigned.</p>;

  return (
    <div className="mt-3">
      {score && (
        <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          CHECKLIST COMPLETION: {score.checklistCompletionPercent != null ? `${score.checklistCompletionPercent}%` : "N/A"} ({score.passedItems} passed / {score.failedItems} failed / {score.requiresReviewItems} needs review / {score.notCheckedItems} not checked). This is not the same as LEGAL CLEARANCE.
        </div>
      )}
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {r.itemLabel} {r.itemRequired && <span className="text-xs text-primary">*</span>}
              </p>
              {r.notes && <p className="text-xs text-muted">{r.notes}</p>}
            </div>
            {canManage ? (
              <select value={r.status} onChange={(e) => setStatus(r.templateItemId, e.target.value as ChecklistResultStatus)} disabled={isPending} className={inputClass}>
                {checklistResultStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-ink">{r.status.replace(/_/g, " ")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
