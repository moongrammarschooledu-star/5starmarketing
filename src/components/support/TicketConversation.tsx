"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Download, Lock, WifiOff } from "lucide-react";
import type { CommMessage } from "@/lib/models/communication";
import { uploadMessageAttachmentAction, getAttachmentSignedUrlAction, getPortalAttachmentSignedUrlAction } from "@/lib/actions/communications.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { saveOfflineDraft, readOfflineDraft, clearOfflineDraft, onReconnect } from "@/lib/offlineDraftQueue";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

/** Reused on both /admin/support/tickets/[id] and
 *  /customer/support/tickets/[id] — the ONLY difference between the
 *  two views is which reply action is passed in and whether internal
 *  notes are visible at all (a customer's own RLS grant already
 *  excludes them server-side; isStaff only controls the UI's private-
 *  note toggle). */
export function TicketConversation({
  conversationId,
  messages,
  isStaff,
  canReply,
  onReply,
}: {
  conversationId: string;
  messages: CommMessage[];
  isStaff: boolean;
  canReply: boolean;
  onReply: (body: string, isPrivateNote: boolean) => Promise<unknown>;
}) {
  const draftKey = `support-reply:${conversationId}`;
  const [body, setBody] = useState("");
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  // Restore an offline-queued reply (STEP 31 section 27) and retry it
  // automatically the moment connectivity returns — replaying through
  // the SAME onReply() any online send would call.
  useEffect(() => {
    const draft = readOfflineDraft<{ body: string; isPrivateNote: boolean }>(draftKey);
    if (draft) {
      setBody(draft.body);
      setIsPrivateNote(draft.isPrivateNote);
      setQueuedOffline(true);
    }
    return onReconnect(() => {
      const pending = readOfflineDraft<{ body: string; isPrivateNote: boolean }>(draftKey);
      if (!pending) return;
      startTransition(async () => {
        try {
          await onReply(pending.body, pending.isPrivateNote);
          clearOfflineDraft(draftKey);
          setBody("");
          setIsPrivateNote(false);
          setQueuedOffline(false);
          router.refresh();
        } catch {
          // Stays queued — the user can still retry manually with Send.
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    if (!body.trim()) {
      setError("Please enter a message.");
      return;
    }
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOfflineDraft(draftKey, { body: body.trim(), isPrivateNote });
      setQueuedOffline(true);
      return;
    }

    startTransition(async () => {
      try {
        await onReply(body.trim(), isPrivateNote);
        clearOfflineDraft(draftKey);
        setBody("");
        setIsPrivateNote(false);
        setQueuedOffline(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send this message.");
      }
    });
  }

  function pickFile(f: File, messageId: string) {
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.show("Unsupported file type. Use PDF, JPG, PNG or WEBP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.show("File is larger than 15MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      startTransition(async () => {
        try {
          await uploadMessageAttachmentAction(messageId, conversationId, f.name, reader.result as string);
          toast.show("Attachment uploaded.");
          router.refresh();
        } catch (e) {
          toast.show(e instanceof Error ? e.message : "Could not upload this attachment.");
        }
      });
    };
    reader.readAsDataURL(f);
  }

  function viewAttachment(attachmentId: string) {
    startTransition(async () => {
      try {
        const url = isStaff ? await getAttachmentSignedUrlAction(attachmentId) : await getPortalAttachmentSignedUrlAction(attachmentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not open this attachment.");
      }
    });
  }

  const visibleMessages = isStaff ? messages : messages.filter((m) => !m.isPrivateNote);

  return (
    <div>
      <div className="space-y-3">
        {visibleMessages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-4 ${m.isPrivateNote ? "border-amber-300 bg-amber-50" : m.direction === "INBOUND" ? "border-border bg-surface" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                {m.isPrivateNote && <Lock className="h-3 w-3 text-amber-600" />}
                {m.isPrivateNote ? "Internal Note" : m.direction === "INBOUND" ? "Customer" : m.senderAdminName ?? "Staff"}
              </span>
              <span className="text-xs text-muted">{new Date(m.createdAt).toLocaleString("en-GB")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
            {m.attachments && m.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <button key={a.id} type="button" onClick={() => viewAttachment(a.id)} className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:underline">
                    <Download className="h-3 w-3" /> {a.fileName}
                  </button>
                ))}
              </div>
            )}
            {canReply && (
              <div className="mt-2">
                <input ref={fileInput} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0], m.id)} />
                <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary">
                  <Paperclip className="h-3 w-3" /> Attach to this message
                </button>
              </div>
            )}
          </div>
        ))}
        {visibleMessages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      </div>

      {canReply && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Type your reply…" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          {error && <p className="mt-1 text-xs font-semibold text-primary">{error}</p>}
          {queuedOffline && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <WifiOff className="h-3.5 w-3.5" /> You&apos;re offline — this will send automatically once you&apos;re back online.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {isStaff && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <input type="checkbox" checked={isPrivateNote} onChange={(e) => setIsPrivateNote(e.target.checked)} />
                Internal note (never visible to the customer)
              </label>
            )}
            <button type="button" onClick={send} disabled={isPending} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {isPrivateNote ? "Add Note" : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
