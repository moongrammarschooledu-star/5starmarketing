"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Star } from "lucide-react";
import { customerRespondToCompletionAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerCompletionConfirmation({ requestId }: { requestId: string }) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function respond(confirmed: boolean) {
    startTransition(async () => {
      try {
        await customerRespondToCompletionAction(requestId, { confirmed, feedback: feedback || undefined, rating: confirmed ? rating : undefined });
        toast.show(confirmed ? "Thank you for confirming!" : "We've reopened this request for follow-up.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not record your response.");
      }
    });
  }

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
      <h3 className="font-heading text-base font-bold text-ink">Is this maintenance work complete?</h3>
      <p className="mt-1 text-xs text-muted">Please confirm so we can close this request, or let us know if the issue remains.</p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
          </button>
        ))}
      </div>

      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback..." className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => respond(true)} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Completed
        </button>
        <button type="button" onClick={() => respond(false)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-primary/30 px-4 py-2 text-xs font-bold text-primary disabled:opacity-50">
          <AlertTriangle className="h-3.5 w-3.5" /> Report Unresolved
        </button>
      </div>
    </div>
  );
}
