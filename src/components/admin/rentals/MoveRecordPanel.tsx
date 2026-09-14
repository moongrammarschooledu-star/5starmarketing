"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RentalMoveRecord, MoveRecordType } from "@/lib/models/rental";
import { ensureMoveRecordAction, updateMoveRecordStepAction, completeMoveRecordAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function MoveRecordPanel({ leaseId, recordType, record, canManage }: { leaseId: string; recordType: MoveRecordType; record?: RentalMoveRecord; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function start() {
    startTransition(async () => {
      try {
        await ensureMoveRecordAction(leaseId, recordType);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not start this record.");
      }
    });
  }

  function toggleStep(field: string, value: boolean) {
    if (!record) return;
    startTransition(async () => {
      await updateMoveRecordStepAction(record.id, { [field]: value });
      router.refresh();
    });
  }

  function complete() {
    if (!record) return;
    startTransition(async () => {
      try {
        await completeMoveRecordAction(record.id);
        toast.show(`${recordType === "MOVE_IN" ? "Move-in" : "Move-out"} completed.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not complete this record.");
      }
    });
  }

  if (!record) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Not started.</p>
        {canManage && (
          <button type="button" onClick={start} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Start {recordType === "MOVE_IN" ? "Move-In" : "Move-Out"}
          </button>
        )}
      </div>
    );
  }

  const steps: { field: string; label: string; checked: boolean }[] =
    recordType === "MOVE_IN"
      ? [
          { field: "depositReceived", label: "Deposit received", checked: record.depositReceived },
          { field: "documentsCompleted", label: "Documents completed", checked: record.documentsCompleted },
          { field: "keysHandedOver", label: "Keys handed over", checked: record.keysHandedOver },
        ]
      : [
          { field: "outstandingRentCleared", label: "Outstanding rent cleared", checked: record.outstandingRentCleared },
          { field: "utilitiesSettled", label: "Utilities settled", checked: record.utilitiesSettled },
          { field: "documentsCompleted", label: "Documents completed", checked: record.documentsCompleted },
        ];

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">Status</p>
        <StatusBadge status={record.status} />
      </div>
      <div className="mt-3 space-y-2">
        {steps.map((s) => (
          <label key={s.field} className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={s.checked}
              disabled={!canManage || isPending || record.status !== "IN_PROGRESS"}
              onChange={(e) => toggleStep(s.field, e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {s.label}
          </label>
        ))}
        <label className="flex items-center gap-2 text-xs font-semibold text-ink">
          <input type="checkbox" checked={record.tenantConfirmed} disabled className="h-4 w-4 rounded border-border text-primary" />
          Tenant confirmed{record.tenantConfirmedAt ? ` (${new Date(record.tenantConfirmedAt).toLocaleDateString("en-GB")})` : ""}
        </label>
      </div>
      {canManage && record.status === "IN_PROGRESS" && (
        <button type="button" onClick={complete} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Mark Completed
        </button>
      )}
    </div>
  );
}
