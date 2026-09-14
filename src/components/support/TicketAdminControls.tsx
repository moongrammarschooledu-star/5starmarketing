"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SupportTicket, SupportTicketStatus, SupportEscalationReason } from "@/lib/models/support";
import { SUPPORT_TICKET_ALLOWED_TRANSITIONS, supportEscalationReasons } from "@/lib/models/support";
import { assignTicketAction, updateTicketStatusAction, escalateTicketAction, attachComplaintToTicketAction, createKbArticleFromTicketAction } from "@/lib/actions/support.actions";
import { useToast } from "@/components/admin/ToastProvider";

const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-primary";

export function TicketAdminControls({
  ticket,
  departments,
  staff,
}: {
  ticket: SupportTicket;
  departments: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const [departmentId, setDepartmentId] = useState(ticket.departmentId ?? "");
  const [assignedStaffId, setAssignedStaffId] = useState(ticket.assignedStaffId ?? "");
  const [escalationReason, setEscalationReason] = useState<SupportEscalationReason>("HIGH_PRIORITY");
  const [escalateTo, setEscalateTo] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function saveAssignment() {
    startTransition(async () => {
      try {
        await assignTicketAction(ticket.id, { departmentId: departmentId || null, assignedStaffId: assignedStaffId || null });
        toast.show("Assignment updated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update assignment.");
      }
    });
  }

  function setStatus(status: SupportTicketStatus) {
    startTransition(async () => {
      try {
        await updateTicketStatusAction(ticket.id, status);
        toast.show(`Status set to ${status.replace(/_/g, " ")}.`);
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not update status.");
      }
    });
  }

  function escalate() {
    if (!escalateTo) {
      toast.show("Please choose who to escalate to.");
      return;
    }
    startTransition(async () => {
      try {
        await escalateTicketAction({ ticketId: ticket.id, reason: escalationReason, newAssigneeId: escalateTo });
        toast.show("Ticket escalated.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not escalate this ticket.");
      }
    });
  }

  function fileComplaint() {
    startTransition(async () => {
      try {
        await attachComplaintToTicketAction(ticket.id);
        toast.show("Complaint filed for this ticket.");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not file a complaint.");
      }
    });
  }

  function convertToKb() {
    const title = window.prompt("Article title:", ticket.subject);
    if (!title) return;
    const answer = window.prompt("Answer (based on how this was resolved):");
    if (!answer) return;
    startTransition(async () => {
      try {
        await createKbArticleFromTicketAction(ticket.id, title, ticket.description, answer, ticket.categoryCode);
        toast.show("Draft knowledge-base article created (not yet published).");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not create this article.");
      }
    });
  }

  const nextStatuses = SUPPORT_TICKET_ALLOWED_TRANSITIONS[ticket.status] ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assignment</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
            <option value="">Unassigned Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)} className={inputClass}>
            <option value="">Unassigned Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={saveAssignment} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
            Save
          </button>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button key={s} type="button" disabled={isPending} onClick={() => setStatus(s)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Escalate</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={escalationReason} onChange={(e) => setEscalationReason(e.target.value as SupportEscalationReason)} className={inputClass}>
            {supportEscalationReasons.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select value={escalateTo} onChange={(e) => setEscalateTo(e.target.value)} className={inputClass}>
            <option value="">Escalate to…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={escalate} disabled={isPending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            Escalate
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ticket.categoryCode !== "COMPLAINT" && (
          <button type="button" onClick={fileComplaint} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
            File as Complaint
          </button>
        )}
        {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
          <button type="button" onClick={convertToKb} disabled={isPending} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted disabled:opacity-50">
            Convert to KB Article
          </button>
        )}
      </div>
    </div>
  );
}
