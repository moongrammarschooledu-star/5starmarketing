"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { retryFailedMessageAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function RetryMessageButton({ messageId, conversationId }: { messageId: string; conversationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function retry() {
    startTransition(async () => {
      try {
        const result = await retryFailedMessageAction(messageId, conversationId);
        toast.show(result.status === "FAILED" ? `Still failed: ${result.failureReason}` : "Message sent.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not retry this message.");
      }
    });
  }

  return (
    <button type="button" onClick={retry} disabled={isPending} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
      <RefreshCw className="h-3.5 w-3.5" /> {isPending ? "Retrying..." : "Retry"}
    </button>
  );
}
