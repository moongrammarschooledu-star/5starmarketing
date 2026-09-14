"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalRisk, LegalRiskSeverity, LegalRiskStatus, PropertyRiskIndicator } from "@/lib/models/legal";
import { legalRiskSeverities } from "@/lib/models/legal";
import { flagLegalRiskAction, updateLegalRiskStatusAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LegalRiskManager({ propertyId, risks, indicator, canManage }: { propertyId: string; risks: LegalRisk[]; indicator: PropertyRiskIndicator; canManage: boolean }) {
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<LegalRiskSeverity>("MEDIUM");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function flag() {
    if (!description.trim()) {
      toast.show("Please describe the risk.");
      return;
    }
    startTransition(async () => {
      try {
        await flagLegalRiskAction({ propertyId, description: description.trim(), severity });
        toast.show("Risk flagged.");
        setDescription("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not flag this risk.");
      }
    });
  }

  function resolve(id: string, status: LegalRiskStatus) {
    startTransition(async () => {
      try {
        await updateLegalRiskStatusAction(id, status);
        toast.show(`Status set to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this risk.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-bold text-ink">Internal Risk Indicator: {indicator.riskIndicatorScore}</p>
        <p className="mt-1 text-xs text-muted">{indicator.disclaimer}</p>
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
          <input placeholder="Risk / requires-review description" value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} flex-1`} />
          <select value={severity} onChange={(e) => setSeverity(e.target.value as LegalRiskSeverity)} className={inputClass}>
            {legalRiskSeverities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" onClick={flag} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Flag Risk
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {risks.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-bold text-ink">{r.description}</p>
              <p className="text-xs text-muted">{r.riskCategory}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.severity} />
              <StatusBadge status={r.status} />
              {canManage && !["MITIGATED", "ACCEPTED", "CLOSED"].includes(r.status) && (
                <>
                  <button type="button" disabled={isPending} onClick={() => resolve(r.id, "MITIGATED")} className="text-xs font-bold text-success hover:underline">
                    Mitigated
                  </button>
                  <button type="button" disabled={isPending} onClick={() => resolve(r.id, "ACCEPTED")} className="text-xs font-bold text-ink hover:underline">
                    Accepted
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {risks.length === 0 && <p className="text-sm text-muted">No risks flagged for this property.</p>}
      </div>
    </div>
  );
}
