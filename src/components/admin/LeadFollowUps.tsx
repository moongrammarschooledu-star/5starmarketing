"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, X, RotateCcw } from "lucide-react";
import clsx from "clsx";
import type { FollowUp, FollowUpType } from "@/lib/models/team";
import { followUpTypes } from "@/lib/models/team";
import { createFollowUpAction, completeFollowUpAction, cancelFollowUpAction, rescheduleFollowUpAction } from "@/lib/actions/followUp.actions";
import { useToast } from "./ToastProvider";
import { formatDateOnly } from "@/lib/date";

const STATUS_TONE: Record<FollowUp["status"], string> = {
  Pending: "bg-primary/10 text-primary",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-muted/20 text-muted",
  Overdue: "bg-amber-500/10 text-amber-600",
};

export function LeadFollowUps({ leadId, followUps, agentId }: { leadId: string; followUps: FollowUp[]; agentId: string }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<FollowUpType>("Call");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date) return;
    startTransition(async () => {
      await createFollowUpAction({ leadId, assignedAgentId: agentId || undefined, followUpDate: date, followUpTime: time || undefined, type, note });
      setDate("");
      setTime("");
      setNote("");
      toast.show("Follow-up scheduled.");
      router.refresh();
    });
  }

  function complete(id: string) {
    startTransition(async () => {
      await completeFollowUpAction(id, leadId);
      toast.show("Follow-up completed.");
      router.refresh();
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      await cancelFollowUpAction(id, leadId);
      toast.show("Follow-up cancelled.");
      router.refresh();
    });
  }

  function reschedule(id: string) {
    const newDate = window.prompt("Reschedule to (YYYY-MM-DD):");
    if (!newDate) return;
    startTransition(async () => {
      await rescheduleFollowUpAction(id, newDate, undefined, leadId);
      toast.show("Follow-up rescheduled.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <CalendarClock className="h-4.5 w-4.5 text-primary" /> Follow-Ups
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as FollowUpType)}
          className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
          {followUpTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !date}
          className="rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          Schedule
        </button>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary sm:col-span-4"
        />
      </form>

      <div className="mt-5 space-y-2.5">
        {followUps.length === 0 && <p className="text-sm text-muted">No follow-ups scheduled yet.</p>}
        {followUps.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted/50 p-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">
                  {formatDateOnly(f.followUpDate)}
                  {f.followUpTime ? ` ${f.followUpTime}` : ""}
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">{f.type}</span>
                <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[f.status])}>{f.status}</span>
              </div>
              {f.note && <p className="mt-1 text-xs text-muted">{f.note}</p>}
            </div>
            {(f.status === "Pending" || f.status === "Overdue") && (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => complete(f.id)} disabled={isPending} className="rounded-full bg-success/10 p-1.5 text-success" aria-label="Complete">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => reschedule(f.id)} disabled={isPending} className="rounded-full bg-primary/10 p-1.5 text-primary" aria-label="Reschedule">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => cancel(f.id)} disabled={isPending} className="rounded-full bg-muted/20 p-1.5 text-muted" aria-label="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
