"use client";

import { useTransition } from "react";
import { Paperclip } from "lucide-react";
import type { CommMessage } from "@/lib/models/communication";
import { getPortalAttachmentSignedUrlAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerMessageThread({ messages }: { messages: CommMessage[] }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function openAttachment(attachmentId: string) {
    startTransition(async () => {
      try {
        const url = await getPortalAttachmentSignedUrlAction(attachmentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this file.");
      }
    });
  }

  if (messages.length === 0) {
    return <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted">No messages yet.</div>;
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isFromMe = m.direction === "INBOUND";
        return (
          <div key={m.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isFromMe ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-ink"}`}>
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
                      className={`flex items-center gap-1.5 text-xs underline-offset-2 hover:underline ${isFromMe ? "text-primary-foreground/80" : "text-muted"}`}
                    >
                      <Paperclip className="h-3 w-3" /> {a.fileName}
                    </button>
                  ))}
                </div>
              )}
              <div className={`mt-2 text-[11px] ${isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {new Date(m.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
