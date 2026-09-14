"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitLegalDocumentForReviewAction, verifyLegalDocumentAction, rejectLegalDocumentAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function VerificationQueueActions({ documentId, status }: { documentId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function act(fn: () => Promise<unknown>, okMessage: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.show(okMessage);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this document.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "UPLOADED" && (
        <button type="button" disabled={isPending} onClick={() => act(() => submitLegalDocumentForReviewAction(documentId), "Submitted for review.")} className="text-xs font-bold text-ink hover:underline">
          Submit for Review
        </button>
      )}
      <button type="button" disabled={isPending} onClick={() => act(() => verifyLegalDocumentAction(documentId), "Verified.")} className="text-xs font-bold text-success hover:underline">
        Verify
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const reason = window.prompt("Rejection reason:");
          if (reason) act(() => rejectLegalDocumentAction(documentId, reason), "Rejected.");
        }}
        className="text-xs font-bold text-primary hover:underline"
      >
        Reject
      </button>
    </div>
  );
}
