"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendPortalReplyAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerReplyBox({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await sendPortalReplyAction(conversationId, body.trim());
        setBody("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not send your reply.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Type your reply..."
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={send} disabled={isPending || !body.trim()} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Send className="h-3.5 w-3.5" /> {isPending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
