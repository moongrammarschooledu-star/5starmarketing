"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkOrderLandlordApprovalStatus } from "@/lib/models/rental";
import { requireWorkOrderLandlordApprovalAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { StatusBadge } from "@/components/admin/StatusBadge";

export function RentalMaintenanceApprovalControl({ workOrderId, status, approvedByName }: { workOrderId: string; status: WorkOrderLandlordApprovalStatus; approvedByName?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function requireApproval() {
    startTransition(async () => {
      try {
        await requireWorkOrderLandlordApprovalAction(workOrderId);
        toast.show("Landlord approval requested.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not request landlord approval.");
      }
    });
  }

  if (status === "NOT_REQUIRED") {
    return (
      <button type="button" onClick={requireApproval} disabled={isPending} className="text-xs font-bold text-primary hover:underline">
        Require Landlord Approval
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span>Landlord approval:</span>
      <StatusBadge status={status} />
      {approvedByName && <span>by {approvedByName}</span>}
    </div>
  );
}
