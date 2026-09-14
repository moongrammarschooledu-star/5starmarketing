"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideLegalApprovalAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function ApprovalDecisionButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function decide(status: "APPROVED" | "REJECTED") {
    const comments = status === "REJECTED" ? window.prompt("Reason for rejection:") ?? undefined : undefined;
    startTransition(async () => {
      try {
        await decideLegalApprovalAction(id, status, comments);
        toast.show(status === "APPROVED" ? "Approved." : "Rejected.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record this decision.");
      }
    });
  }

  return (
    <div className="flex justify-end gap-1.5">
      <button type="button" disabled={isPending} onClick={() => decide("APPROVED")} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-success hover:bg-surface-muted disabled:opacity-50">
        Approve
      </button>
      <button type="button" disabled={isPending} onClick={() => decide("REJECTED")} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-surface-muted disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
