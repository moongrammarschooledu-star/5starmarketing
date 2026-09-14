"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignLegalOfficerAction, updateLegalPropertyNotesAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LegalOfficerAssignForm({
  propertyId,
  legalOfficerId,
  internalNotes,
  officers,
}: {
  propertyId: string;
  legalOfficerId?: string;
  internalNotes?: string;
  officers: { id: string; name: string }[];
}) {
  const [officerId, setOfficerId] = useState(legalOfficerId ?? "");
  const [notes, setNotes] = useState(internalNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function assign() {
    startTransition(async () => {
      try {
        await assignLegalOfficerAction(propertyId, officerId || null);
        toast.show("Legal officer updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not assign a legal officer.");
      }
    });
  }

  function saveNotes() {
    startTransition(async () => {
      try {
        await updateLegalPropertyNotesAction(propertyId, notes);
        toast.show("Internal notes saved.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not save these notes.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Legal Officer</span>
        <select value={officerId} onChange={(e) => setOfficerId(e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {officers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={assign} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          Save
        </button>
      </div>
      <div className="mt-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Internal Notes (never customer-visible)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`mt-1 w-full ${inputClass}`} />
        <button type="button" onClick={saveNotes} disabled={isPending} className="mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          Save Notes
        </button>
      </div>
    </div>
  );
}
