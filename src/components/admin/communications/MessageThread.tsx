"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle, Paperclip, Send } from "lucide-react";
import type { CommMessage } from "@/lib/models/communication";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cancelScheduledMessageAction, retryFailedMessageAction, sendDraftAction, getAttachmentSignedUrlAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function MessageThread({ messages, conversationId }: { messages: CommMessage[]; conversationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function retry(messageId: string) {
    startTransition(async () => {
      const result = await retryFailedMessageAction(messageId, conversationId);
      toast.show(result.status === "FAILED" ? `Retry failed: ${result.failureReason}` : "Message sent.");
      router.refresh();
    });
  }

  function cancel(messageId: string) {
    startTransition(async () => {
      await cancelScheduledMessageAction(messageId, conversationId);
      toast.show("Scheduled message cancelled.");
      router.refresh();
    });
  }

  function sendDraft(messageId: string) {
    startTransition(async () => {
      const result = await sendDraftAction(messageId, conversationId);
      toast.show(result.status === "FAILED" ? `Send failed: ${result.failureReason}` : "Message sent.");
      router.refresh();
    });
  }

  function openAttachment(attachmentId: string) {
    startTransition(async () => {
      try {
        const url = await getAttachmentSignedUrlAction(attachmentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this file.");
      }
    });
  }

  if (messages.length === 0) {
    return <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted">No messages yet — start the conversation below.</div>;
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isOutbound = m.direction === "OUTBOUND";
        const isInternal = m.direction === "INTERNAL" || m.isPrivateNote;
        return (
          <div key={m.id} className={`flex ${isOutbound || isInternal ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                isInternal ? "border border-dashed border-amber-500/40 bg-amber-500/5 text-ink" : isOutbound ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-ink"
              }`}
            >
              {isInternal && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Internal Note — never visible to the customer</p>}
              {m.subject && <p className="mb-1 font-bold">{m.subject}</p>}
              <p className="whitespace-pre-line">{m.body}</p>
              {m.attachments && m.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {m.attachments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openAttachment(a.id)}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 text-xs underline-offset-2 hover:underline ${isOutbound ? "text-primary-foreground/80" : "text-muted"}`}
                    >
                      <Paperclip className="h-3 w-3" /> {a.fileName}
                    </button>
                  ))}
                </div>
              )}
              <div className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                <span>{m.senderAdminName || (m.direction === "INBOUND" ? "Customer" : "")}</span>
                <span>{new Date(m.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {!isInternal && <StatusBadge status={m.status} />}
                {m.status === "FAILED" && (
                  <button type="button" onClick={() => retry(m.id)} disabled={isPending} title="Retry" className="rounded-full bg-white/20 p-1 hover:bg-white/30">
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
                {(m.status === "SCHEDULED" || m.status === "QUEUED") && (
                  <button type="button" onClick={() => cancel(m.id)} disabled={isPending} title="Cancel" className="rounded-full bg-white/20 p-1 hover:bg-white/30">
                    <XCircle className="h-3 w-3" />
                  </button>
                )}
                {m.status === "DRAFT" && (
                  <button type="button" onClick={() => sendDraft(m.id)} disabled={isPending} title="Send" className="rounded-full bg-white/20 p-1 hover:bg-white/30">
                    <Send className="h-3 w-3" />
                  </button>
                )}
              </div>
              {m.failureReason && <p className={`mt-1 text-[11px] ${isOutbound ? "text-primary-foreground/90" : "text-primary"}`}>{m.failureReason}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
