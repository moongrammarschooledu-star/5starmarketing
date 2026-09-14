import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ticketService } from "./ticketService";
import { supportAuditService } from "./supportAuditService";
import { staffNotificationService } from "./staffNotificationService";
import { notificationService } from "./notificationService";
import { COMPLAINT_ALLOWED_TRANSITIONS } from "@/lib/models/support";
import type { SupportComplaint, ComplaintStatus, ComplaintSeverity, SupportTicketInput } from "@/lib/models/support";

const SELECT = "*, support_tickets(ticket_number, subject, customer_id, property_id, department_id, properties(title)), officer:admin_profiles!support_complaints_assigned_officer_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportComplaint {
  return {
    id: row.id,
    complaintNumber: row.complaint_number,
    ticketId: row.ticket_id,
    ticketNumber: row.support_tickets?.ticket_number ?? undefined,
    ticketSubject: row.support_tickets?.subject ?? undefined,
    customerId: row.support_tickets?.customer_id ?? undefined,
    propertyId: row.support_tickets?.property_id ?? undefined,
    propertyTitle: row.support_tickets?.properties?.title ?? undefined,
    severity: row.severity,
    assignedOfficerId: row.assigned_officer_id ?? undefined,
    assignedOfficerName: row.officer?.name ?? undefined,
    status: row.status,
    resolution: row.resolution ?? undefined,
    customerResponse: row.customer_response ?? undefined,
    closureReason: row.closure_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const complaintService = {
  async list(filters?: { status?: ComplaintStatus; assignedOfficerId?: string }): Promise<SupportComplaint[]> {
    const supabase = await createClient();
    let query = supabase.from("support_complaints").select(SELECT).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.assignedOfficerId) query = query.eq("assigned_officer_id", filters.assignedOfficerId);
    const { data, error } = await query;
    if (error) {
      console.error("complaintService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SupportComplaint | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_complaints").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getByTicketId(ticketId: string): Promise<SupportComplaint | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_complaints").select(SELECT).eq("ticket_id", ticketId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Files a brand-new complaint — always via a ticket (never a
   *  parallel object): the ticket is opened under the COMPLAINT
   *  category first, then this companion row adds the complaint-
   *  specific fields. */
  async fileNew(ticketInput: Omit<SupportTicketInput, "categoryCode">, severity: ComplaintSeverity | undefined, actor: { customerId?: string; customerName?: string; adminId?: string; adminName?: string }): Promise<SupportComplaint> {
    const ticket = await ticketService.create({ ...ticketInput, categoryCode: "COMPLAINT", priority: ticketInput.priority ?? "HIGH" }, actor);
    return this.attachToTicket(ticket.id, severity, actor.adminId);
  },

  async attachToTicket(ticketId: string, severity: ComplaintSeverity | undefined, actorId?: string): Promise<SupportComplaint> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_complaints").insert({ ticket_id: ticketId, severity: severity ?? "MEDIUM" }).select(SELECT).single();
    if (error) {
      console.error("complaintService.attachToTicket failed:", error);
      throw new Error("Could not file this complaint.");
    }
    const complaint = mapRow(data);
    await supportAuditService.log({ entityType: "support_complaint", entityId: complaint.id, action: "Filed", actorId, newValue: { complaintNumber: complaint.complaintNumber } });
    if (complaint.customerId) {
      await notificationService.notify(complaint.customerId, "support_complaint_acknowledged", "Complaint received", `${complaint.complaintNumber} has been logged and will be reviewed.`, "support_complaint", complaint.id);
    }
    return complaint;
  },

  async assignOfficer(complaintId: string, officerId: string | null, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("support_complaints").update({ assigned_officer_id: officerId }).eq("id", complaintId);
    if (error) throw new Error("Could not assign an officer to this complaint.");
    await supportAuditService.log({ entityType: "support_complaint", entityId: complaintId, action: officerId ? "Officer assigned" : "Officer unassigned", actorId, actorName });
    if (officerId) {
      await staffNotificationService.notify(officerId, "support_complaint_filed", "Complaint assigned to you", "A complaint has been assigned to you for investigation.", "support_complaint", complaintId);
    }
  },

  /** Never fabricates an investigation result — resolution/
   *  closureReason are only ever written when an authorized user
   *  actually enters them. */
  async updateStatus(complaintId: string, nextStatus: ComplaintStatus, actorId: string, actorName: string, fields?: { resolution?: string; customerResponse?: string; closureReason?: string }): Promise<SupportComplaint> {
    const current = await this.getById(complaintId);
    if (!current) throw new Error("Complaint not found.");
    if (!COMPLAINT_ALLOWED_TRANSITIONS[current.status]?.includes(nextStatus)) {
      throw new Error(`Cannot move a complaint from "${current.status}" to "${nextStatus}".`);
    }
    const supabase = await createClient();
    const row: Record<string, unknown> = { status: nextStatus };
    if (fields?.resolution !== undefined) row.resolution = fields.resolution || null;
    if (fields?.customerResponse !== undefined) row.customer_response = fields.customerResponse || null;
    if (fields?.closureReason !== undefined) row.closure_reason = fields.closureReason || null;
    const { data, error } = await supabase.from("support_complaints").update(row).eq("id", complaintId).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this complaint.");
    const complaint = mapRow(data);
    await supportAuditService.log({ entityType: "support_complaint", entityId: complaintId, action: `Status changed to ${nextStatus}`, actorId, actorName, oldValue: { status: current.status }, newValue: { status: nextStatus } });

    if (nextStatus === "ESCALATED" && complaint.customerId) {
      await notificationService.notify(complaint.customerId, "support_complaint_acknowledged", "Complaint escalated", `${complaint.complaintNumber} has been escalated for further review.`, "support_complaint", complaint.id);
    }
    return complaint;
  },
};
