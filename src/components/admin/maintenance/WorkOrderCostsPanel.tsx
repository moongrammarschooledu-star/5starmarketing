"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MaintenanceWorkOrder } from "@/lib/models/maintenance";
import { updateWorkOrderCostsAction, logWorkOrderAsExpenseAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function WorkOrderCostsPanel({ workOrder }: { workOrder: MaintenanceWorkOrder }) {
  const [estimatedCost, setEstimatedCost] = useState(workOrder.estimatedCost?.toString() ?? "");
  const [approvedCost, setApprovedCost] = useState(workOrder.approvedCost?.toString() ?? "");
  const [actualCost, setActualCost] = useState(workOrder.actualCost?.toString() ?? "");
  const [customerCharge, setCustomerCharge] = useState(workOrder.customerCharge?.toString() ?? "");
  const [internalCost, setInternalCost] = useState(workOrder.internalCost?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await updateWorkOrderCostsAction(workOrder.id, {
          estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
          approvedCost: approvedCost ? Number(approvedCost) : undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
          customerCharge: customerCharge ? Number(customerCharge) : undefined,
          internalCost: internalCost ? Number(internalCost) : undefined,
        });
        toast.show("Costs updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update costs.");
      }
    });
  }

  function logAsExpense() {
    startTransition(async () => {
      try {
        await logWorkOrderAsExpenseAction(workOrder.id);
        toast.show("Logged as a draft expense in Accounting.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not log this as an expense.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-base font-bold text-ink">Costs (Manager Only)</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumField label="Estimated" value={estimatedCost} onChange={setEstimatedCost} />
        <NumField label="Approved" value={approvedCost} onChange={setApprovedCost} />
        <NumField label="Actual (Internal)" value={actualCost} onChange={setActualCost} />
        <NumField label="Customer Charge" value={customerCharge} onChange={setCustomerCharge} />
        <NumField label="Internal Cost" value={internalCost} onChange={setInternalCost} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Save Costs
        </button>
        <button type="button" onClick={logAsExpense} disabled={isPending || !!workOrder.expenseId} className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          {workOrder.expenseId ? "Already Logged as Expense" : "Log as Expense"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Logging creates a draft expense against the existing &apos;Maintenance&apos; account — approve/pay it in Accounting as usual.</p>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}
