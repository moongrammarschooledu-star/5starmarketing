"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { MaintenanceComment } from "@/lib/models/maintenance";
import { addMaintenanceCommentAction } from "@/lib/actions/maintenance.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function CustomerCommentThread({ requestId, comments }: { requestId: string; comments: MaintenanceComment[] }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await addMaintenanceCommentAction(requestId, body.trim());
        setBody("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this comment.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink">{c.authorName}</p>
              <p className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString("en-GB")}</p>
            </div>
            <p className="mt-1 text-sm text-ink">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment..." className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={submit} disabled={isPending || !body.trim()} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> Post
          </button>
        </div>
      </div>
    </div>
  );
}
