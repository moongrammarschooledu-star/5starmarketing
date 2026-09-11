"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cancelScheduledMessageAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CancelScheduleButton({ messageId, conversationId }: { messageId: string; conversationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function cancel() {
    if (!confirm("Cancel this scheduled message?")) return;
    startTransition(async () => {
      await cancelScheduledMessageAction(messageId, conversationId);
      toast.show("Scheduled message cancelled.");
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={cancel} disabled={isPending} className="flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
      <X className="h-3.5 w-3.5" /> Cancel
    </button>
  );
}
