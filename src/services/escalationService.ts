import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ticketService } from "./ticketService";
import { supportAuditService } from "./supportAuditService";
import { staffNotificationService } from "./staffNotificationService";
import type { SupportEscalation, SupportEscalationInput } from "@/lib/models/support";

const SELECT =
  "*, prev_dept:support_departments!support_escalations_previous_department_id_fkey(name), new_dept:support_departments!support_escalations_new_department_id_fkey(name), prev_assignee:admin_profiles!support_escalations_previous_assignee_id_fkey(name), new_assignee:admin_profiles!support_escalations_new_assignee_id_fkey(name), escalator:admin_profiles!support_escalations_escalated_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportEscalation {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    reason: row.reason,
    previousDepartmentId: row.previous_department_id ?? undefined,
    previousDepartmentName: row.prev_dept?.name ?? undefined,
    newDepartmentId: row.new_department_id ?? undefined,
    newDepartmentName: row.new_dept?.name ?? undefined,
    previousAssigneeId: row.previous_assignee_id ?? undefined,
    previousAssigneeName: row.prev_assignee?.name ?? undefined,
    newAssigneeId: row.new_assignee_id ?? undefined,
    newAssigneeName: row.new_assignee?.name ?? undefined,
    resolutionAuthority: row.resolution_authority ?? undefined,
    notes: row.notes ?? undefined,
    escalatedBy: row.escalated_by ?? undefined,
    escalatedByName: row.escalator?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const escalationService = {
  async listForTicket(ticketId: string): Promise<SupportEscalation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_escalations").select(SELECT).eq("ticket_id", ticketId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async listAll(limit = 100): Promise<SupportEscalation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_escalations").select(SELECT).order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** Records WHY/WHO, then applies the actual department/assignee
   *  change to the ticket itself via ticketService.assign() and moves
   *  its status to ESCALATED — one service call, one audit trail. */
  async escalate(input: SupportEscalationInput, actorId: string, actorName: string): Promise<SupportEscalation> {
    const ticket = await ticketService.getById(input.ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_escalations")
      .insert({
        ticket_id: input.ticketId,
        reason: input.reason,
        previous_department_id: ticket.departmentId || null,
        new_department_id: input.newDepartmentId || ticket.departmentId || null,
        previous_assignee_id: ticket.assignedStaffId || null,
        new_assignee_id: input.newAssigneeId || null,
        resolution_authority: input.resolutionAuthority || null,
        notes: input.notes || null,
        escalated_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("escalationService.escalate failed:", error);
      throw new Error("Could not escalate this ticket.");
    }
    const escalation = mapRow(data);

    await ticketService.assign(input.ticketId, { departmentId: input.newDepartmentId, assignedStaffId: input.newAssigneeId }, actorId, actorName);
    if (ticket.status !== "ESCALATED") {
      await ticketService.updateStatus(input.ticketId, "ESCALATED", actorId, actorName).catch(() => undefined);
    }
    await supportAuditService.log({ entityType: "support_ticket", entityId: input.ticketId, action: "Escalated", actorId, actorName, reason: input.reason });

    if (input.newAssigneeId) {
      await staffNotificationService.notify(input.newAssigneeId, "support_ticket_escalated", "Ticket escalated to you", `${ticket.ticketNumber}: ${ticket.subject}`, "support_ticket", ticket.id);
    }
    return escalation;
  },
};
