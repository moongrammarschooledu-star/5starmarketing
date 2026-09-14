"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import type { LandlordStatement } from "@/lib/models/rental";
import { generateLandlordStatementAction, finalizeLandlordStatementAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LandlordStatementManager({ landlordId, statements, canManage }: { landlordId: string; statements: LandlordStatement[]; canManage: boolean }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function generate() {
    if (!periodStart || !periodEnd) {
      toast.show("Please select a period start and end date.");
      return;
    }
    startTransition(async () => {
      try {
        await generateLandlordStatementAction({ landlordId, periodStart, periodEnd });
        toast.show("Statement generated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not generate this statement.");
      }
    });
  }

  function finalize(id: string) {
    startTransition(async () => {
      try {
        await finalizeLandlordStatementAction(id);
        toast.show("Statement finalized.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not finalize this statement.");
      }
    });
  }

  return (
    <div className="mt-3">
      {canManage && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Period Start
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Period End
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
          </label>
          <button type="button" onClick={generate} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <FileDown className="h-3.5 w-3.5" /> Generate Statement
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {statements.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{s.statementNumber}</p>
                <p className="text-xs text-muted">
                  {new Date(s.periodStart).toLocaleDateString("en-GB")} – {new Date(s.periodEnd).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                {canManage && s.status === "DRAFT" && (
                  <button type="button" onClick={() => finalize(s.id)} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
                    Finalize
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
              <span>Opening: {formatPKR(s.openingBalance)}</span>
              <span>Rent Collected: {formatPKR(s.rentCollected)}</span>
              <span>Other Income: {formatPKR(s.otherIncome)}</span>
              <span>Maintenance: -{formatPKR(s.maintenanceExpenses)}</span>
              <span>Management Fees: -{formatPKR(s.managementFees)}</span>
              <span>Other Expenses: -{formatPKR(s.otherExpenses)}</span>
              <span>Adjustments: {formatPKR(s.adjustments)}</span>
              <span className="font-bold text-ink">Net: {formatPKR(s.netAmount)}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-ink">Closing Balance: {formatPKR(s.closingBalance)}</p>
          </div>
        ))}
        {statements.length === 0 && <p className="text-sm text-muted">No statements generated yet.</p>}
      </div>
    </div>
  );
}
