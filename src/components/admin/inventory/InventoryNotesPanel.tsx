"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Send } from "lucide-react";
import type { InventoryNote } from "@/lib/models/inventory";
import { addInventoryNoteAction } from "@/lib/actions/inventory.actions";
import { useToast } from "@/components/admin/ToastProvider";

export function InventoryNotesPanel({ inventoryId, notes }: { inventoryId: string; notes: InventoryNote[] }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addInventoryNoteAction(inventoryId, trimmed);
      setValue("");
      toast.show("Note added.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <StickyNote className="h-4.5 w-4.5 text-primary" /> Internal Notes
      </h2>
      <p className="mt-1 text-xs text-muted">Private to CRM staff.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder='e.g. "Owner requested temporary hold."'
          className="flex-1 resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <button type="submit" disabled={isPending || !value.trim()} className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:self-end">
          <Send className="h-4 w-4" /> Add Note
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-surface-muted/50 p-3.5">
            <p className="whitespace-pre-line text-sm text-ink">{n.note}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">{n.createdBy || "Admin"}</span>
              <span>·</span>
              <span>{new Date(n.createdAt).toLocaleString("en-GB")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
