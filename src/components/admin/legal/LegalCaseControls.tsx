"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LegalCase, LegalCaseStatus, LegalCaseEventType } from "@/lib/models/legal";
import { legalCaseStatuses, legalCaseEventTypes } from "@/lib/models/legal";
import { updateLegalCaseAction, addLegalCaseEventAction } from "@/lib/actions/legal.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary";

export function LegalCaseControls({ legalCase, canManage }: { legalCase: LegalCase; canManage: boolean }) {
  const [status, setStatusVal] = useState<LegalCaseStatus>(legalCase.status);
  const [nextHearingDate, setNextHearingDate] = useState(legalCase.nextHearingDate ?? "");
  const [outcomeSummary, setOutcomeSummary] = useState(legalCase.outcomeSummary ?? "");
  const [eventType, setEventType] = useState<LegalCaseEventType>("NOTE");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function save() {
    startTransition(async () => {
      try {
        await updateLegalCaseAction(legalCase.id, { status, nextHearingDate: nextHearingDate || undefined, outcomeSummary: outcomeSummary || undefined }, legalCase.legalOfficerId);
        toast.show("Case updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update this case.");
      }
    });
  }

  function addEvent() {
    if (!description.trim()) {
      toast.show("Please describe this event.");
      return;
    }
    startTransition(async () => {
      try {
        await addLegalCaseEventAction({ caseId: legalCase.id, eventType, eventDate, description: description.trim() }, legalCase.legalOfficerId);
        toast.show("Event added.");
        setDescription("");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not add this event.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={status} onChange={(e) => setStatusVal(e.target.value as LegalCaseStatus)} className={inputClass}>
              {legalCaseStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input type="date" value={nextHearingDate} onChange={(e) => setNextHearingDate(e.target.value)} className={inputClass} />
          </div>
          <textarea value={outcomeSummary} onChange={(e) => setOutcomeSummary(e.target.value)} placeholder="Outcome summary (only when authorized to conclude)" rows={2} className={`mt-3 w-full ${inputClass}`} />
          <button type="button" onClick={save} disabled={isPending} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Save
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-sm font-bold text-ink">Add Case Event</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select value={eventType} onChange={(e) => setEventType(e.target.value as LegalCaseEventType)} className={inputClass}>
            {legalCaseEventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className={`mt-3 w-full ${inputClass}`} />
        <button type="button" onClick={addEvent} disabled={isPending} className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
          Add Event
        </button>
      </div>
    </div>
  );
}
