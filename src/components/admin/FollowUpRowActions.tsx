"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw } from "lucide-react";
import { completeFollowUpAction, cancelFollowUpAction, rescheduleFollowUpAction } from "@/lib/actions/followUp.actions";
import type { FollowUpStatus } from "@/lib/models/team";
import { useToast } from "./ToastProvider";

export function FollowUpRowActions({ id, status, leadId }: { id: string; status: FollowUpStatus; leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (status !== "Pending" && status !== "Overdue") return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await completeFollowUpAction(id, leadId);
            toast.show("Follow-up completed.");
            router.refresh();
          })
        }
        className="rounded-full bg-success/10 p-1.5 text-success"
        aria-label="Complete"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const newDate = window.prompt("Reschedule to (YYYY-MM-DD):");
          if (!newDate) return;
          startTransition(async () => {
            await rescheduleFollowUpAction(id, newDate, undefined, leadId);
            toast.show("Follow-up rescheduled.");
            router.refresh();
          });
        }}
        className="rounded-full bg-primary/10 p-1.5 text-primary"
        aria-label="Reschedule"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await cancelFollowUpAction(id, leadId);
            toast.show("Follow-up cancelled.");
            router.refresh();
          })
        }
        className="rounded-full bg-muted/20 p-1.5 text-muted"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
