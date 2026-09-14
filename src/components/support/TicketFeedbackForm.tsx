"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitTicketFeedbackAction, requestReopenAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function TicketFeedbackForm({ ticketId, canReopen }: { ticketId: string; canReopen: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    startTransition(async () => {
      try {
        await submitTicketFeedbackAction(ticketId, { satisfactionRating: rating, satisfactionComment: comment || undefined });
        toast.show("Thanks for your feedback.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not submit your feedback.");
      }
    });
  }

  function reopen() {
    startTransition(async () => {
      try {
        await requestReopenAction(ticketId);
        toast.show("Ticket reopened.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not reopen this ticket.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">How did we do?</h3>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`h-8 w-8 rounded-full text-sm font-bold ${n <= rating ? "bg-primary text-primary-foreground" : "border border-border text-muted"}`}>
            {n}
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Any comments? (optional)" rows={2} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={submit} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Submit Feedback
        </button>
        {canReopen && (
          <button type="button" onClick={reopen} disabled={isPending} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
            Not resolved — Reopen
          </button>
        )}
      </div>
    </div>
  );
}
