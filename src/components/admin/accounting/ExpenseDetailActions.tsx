"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Eye, Send, Banknote, Paperclip } from "lucide-react";
import type { Expense } from "@/lib/models/accounting";
import { submitExpenseAction, markExpenseUnderReviewAction, approveExpenseAction, rejectExpenseAction, markExpensePaidAction, getExpenseAttachmentSignedUrlAction } from "@/lib/actions/accounting.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function ExpenseDetailActions({ expense, canManage }: { expense: Expense; canManage: boolean }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.show(successMessage);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  function openAttachment(attachmentId: string) {
    startTransition(async () => {
      try {
        const url = await getExpenseAttachmentSignedUrlAction(attachmentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this file.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {expense.attachments && expense.attachments.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Receipts</p>
          <div className="mt-2 space-y-1.5">
            {expense.attachments.map((a) => (
              <button key={a.id} type="button" onClick={() => openAttachment(a.id)} disabled={isPending} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Paperclip className="h-3.5 w-3.5" /> {a.fileName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        {expense.status === "DRAFT" && (
          <button type="button" onClick={() => run(() => submitExpenseAction(expense.id), "Expense submitted.")} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> Submit for Approval
          </button>
        )}

        {canManage && expense.status === "SUBMITTED" && (
          <button type="button" onClick={() => run(() => markExpenseUnderReviewAction(expense.id), "Marked under review.")} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
            <Eye className="h-3.5 w-3.5" /> Mark Under Review
          </button>
        )}

        {canManage && (expense.status === "SUBMITTED" || expense.status === "UNDER_REVIEW") && (
          <>
            <button type="button" onClick={() => run(() => approveExpenseAction(expense.id), "Expense approved.")} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </button>
            <button type="button" onClick={() => setShowReject((v) => !v)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-primary/30 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}

        {canManage && expense.status === "APPROVED" && (
          <button type="button" onClick={() => run(() => markExpensePaidAction(expense.id), "Expense marked paid.")} disabled={isPending} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Banknote className="h-3.5 w-3.5" /> Mark as Paid
          </button>
        )}
      </div>

      {showReject && (
        <div className="rounded-2xl border border-dashed border-primary/30 p-4">
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder="Reason for rejection..." className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          <button
            type="button"
            onClick={() => {
              if (!rejectReason.trim()) {
                toast.show("Please enter a reason.");
                return;
              }
              run(() => rejectExpenseAction(expense.id, rejectReason), "Expense rejected.");
              setShowReject(false);
            }}
            disabled={isPending}
            className="mt-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            Confirm Rejection
          </button>
        </div>
      )}

      {expense.rejectedReason && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <span className="font-bold">Rejected:</span> {expense.rejectedReason}
        </div>
      )}
    </div>
  );
}
