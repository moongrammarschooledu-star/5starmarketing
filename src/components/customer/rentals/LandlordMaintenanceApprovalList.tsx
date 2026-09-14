"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordWorkOrderLandlordApprovalAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPKR } from "@/lib/calculator";

export function LandlordMaintenanceApprovalList({ items }: { items: { id: string; workOrderNumber: string; description: string; estimatedCost?: number; propertyTitle?: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function decide(workOrderId: string, decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      try {
        await recordWorkOrderLandlordApprovalAction(workOrderId, decision);
        toast.show(`Work order ${decision === "APPROVED" ? "approved" : "rejected"}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record your decision.");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {items.map((i) => (
        <div key={i.id} className="rounded-xl border border-border bg-surface p-3.5">
          <p className="text-sm font-semibold text-ink">
            {i.workOrderNumber} — {i.propertyTitle ?? "Property"}
          </p>
          <p className="text-xs text-muted">
            {i.description} {i.estimatedCost != null ? `· Est. ${formatPKR(i.estimatedCost)}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => decide(i.id, "APPROVED")} disabled={isPending} className="rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              Approve
            </button>
            <button type="button" onClick={() => decide(i.id, "REJECTED")} disabled={isPending} className="rounded-full border-2 border-primary/30 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted">Nothing awaiting your approval.</p>}
    </div>
  );
}
