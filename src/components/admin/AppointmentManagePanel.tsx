"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, CalendarClock, UserCog, StickyNote } from "lucide-react";
import type { Appointment, TimeSlot } from "@/lib/models/appointment";
import { appointmentStatuses } from "@/lib/models/appointment";
import {
  updateAppointmentStatusAction,
  rescheduleAppointmentAction,
  assignAppointmentAgentAction,
  updateAppointmentNotesAction,
} from "@/lib/actions/appointments.actions";
import { getAvailabilityAction } from "@/lib/actions/appointment.actions";
import { useToast } from "./ToastProvider";

export function AppointmentManagePanel({
  appointment,
  assignableAgents = [],
  canAssign = true,
}: {
  appointment: Appointment;
  assignableAgents?: { id: string; name: string }[];
  canAssign?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const [newDate, setNewDate] = useState(appointment.appointmentDate);
  const [newTime, setNewTime] = useState(appointment.appointmentTime);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [agentId, setAgentId] = useState(appointment.assignedAgentId ?? "");
  const [notes, setNotes] = useState(appointment.adminNotes ?? "");

  useEffect(() => {
    getAvailabilityAction(newDate).then((result) => {
      // The appointment's own current slot should always show as
      // selectable even if it's technically "booked" (by itself).
      setSlots(result.map((s) => (s.time === appointment.appointmentTime && newDate === appointment.appointmentDate ? { ...s, available: true } : s)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newDate]);

  function runStatus(status: Appointment["status"]) {
    startTransition(async () => {
      try {
        await updateAppointmentStatusAction(appointment.id, status);
        toast.show(`Status updated to ${status}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update status.", "error");
      }
    });
  }

  function runReschedule() {
    startTransition(async () => {
      try {
        await rescheduleAppointmentAction(appointment.id, newDate, newTime);
        toast.show("Appointment rescheduled.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not reschedule.", "error");
      }
    });
  }

  function runAgent() {
    const agent = assignableAgents.find((a) => a.id === agentId);
    startTransition(async () => {
      await assignAppointmentAgentAction(appointment.id, agent?.id ?? null, agent?.name ?? null);
      toast.show(agent ? `Assigned to ${agent.name}.` : "Appointment unassigned.");
      router.refresh();
    });
  }

  function runNotes() {
    startTransition(async () => {
      await updateAppointmentNotesAction(appointment.id, notes);
      toast.show("Notes saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-heading text-sm font-bold text-ink">Change Status</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {appointmentStatuses.map((s) => (
            <button
              key={s}
              type="button"
              disabled={isPending || appointment.status === s}
              onClick={() => runStatus(s)}
              className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {s === "Confirmed" && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
              {s === "Cancelled" && <XCircle className="mr-1 inline h-3.5 w-3.5" />}
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <CalendarClock className="h-4.5 w-4.5 text-primary" /> Reschedule
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            New Date
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setNewTime(slot.time)}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${
                  !slot.available
                    ? "cursor-not-allowed border-border text-muted-foreground opacity-40 line-through"
                    : newTime === slot.time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-ink/15 text-ink hover:border-primary"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={runReschedule}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Save Reschedule
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <UserCog className="h-4.5 w-4.5 text-primary" /> Assigned Agent
        </h2>
        {canAssign ? (
          <div className="mt-3 flex gap-2">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="">Unassigned</option>
              {assignableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending}
              onClick={runAgent}
              className="rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-ink">{appointment.assignedAgent || "Unassigned"}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
          <StickyNote className="h-4.5 w-4.5 text-primary" /> Internal Notes
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Never shown to the customer.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={runNotes}
          className="mt-2 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
        >
          Save Notes
        </button>
      </section>
    </div>
  );
}
