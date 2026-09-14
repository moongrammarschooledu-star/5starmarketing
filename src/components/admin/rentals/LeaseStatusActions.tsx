"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaseStatus } from "@/lib/models/rental";
import { LEASE_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import { updateLeaseStatusAction } from "@/lib/actions/rental.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function LeaseStatusActions({ leaseId, status }: { leaseId: string; status: LeaseStatus }) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const allowed = LEASE_ALLOWED_TRANSITIONS[status];

  function move(next: LeaseStatus) {
    if (next === "TERMINATED" && !reason.trim()) {
      toast.show("Please enter a termination reason.");
      return;
    }
    startTransition(async () => {
      try {
        await updateLeaseStatusAction(leaseId, next, next === "TERMINATED" ? reason : undefined);
        toast.show(`Moved to ${next.replace(/_/g, " ")}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this lease.");
      }
    });
  }

  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed.includes("TERMINATED") && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Termination reason" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-primary" />
      )}
      {allowed.map((next) => (
        <button key={next} type="button" onClick={() => move(next)} disabled={isPending} className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
          Move to {next.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
