"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyComplianceRecord, ComplianceStatus, LegalChecklistTemplate } from "@/lib/models/legal";
import { complianceStatuses } from "@/lib/models/legal";
import { createComplianceRecordAction, updateComplianceStatusAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function ComplianceManager({ propertyId, records, templates, canManage }: { propertyId: string; records: PropertyComplianceRecord[]; templates: LegalChecklistTemplate[]; canManage: boolean }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function create() {
    startTransition(async () => {
      try {
        await createComplianceRecordAction({ propertyId, checklistTemplateId: templateId || undefined });
        toast.show("Compliance record created.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this compliance record.");
      }
    });
  }

  function setStatus(id: string, status: ComplianceStatus) {
    startTransition(async () => {
      try {
        await updateComplianceStatusAction(id, status);
        toast.show(`Status set to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this record.");
      }
    });
  }

  return (
    <div className="mt-3">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputClass}>
            <option value="">No template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={create} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            New Compliance Record
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {records.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">Compliance Record</p>
              <p className="text-xs text-muted">{r.nextReviewDate ? `Next review: ${r.nextReviewDate}` : "No review date set"}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {canManage && (
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as ComplianceStatus)} disabled={isPending} className={inputClass}>
                  {complianceStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-muted">No compliance records for this property yet.</p>}
      </div>
    </div>
  );
}
