import "server-only";
import { createClient } from "@/lib/supabase/server";
import { communicationService } from "./communicationService";
import { supportCategoryService } from "./supportCategoryService";
import { supportSlaService } from "./supportSlaService";
import { supportSettingsService } from "./supportSettingsService";
import { supportAuditService } from "./supportAuditService";
import { staffNotificationService } from "./staffNotificationService";
import { notificationService } from "./notificationService";
import { SUPPORT_TICKET_ALLOWED_TRANSITIONS } from "@/lib/models/support";
import type { SupportTicket, SupportTicketInput, SupportTicketStatus, SupportTicketPriority, SupportTicketFeedbackInput } from "@/lib/models/support";

const SELECT =
  "*, support_categories(label), support_departments(name), assignee:admin_profiles!support_tickets_assigned_staff_id_fkey(name), creator:admin_profiles!support_tickets_created_by_fkey(name), properties(title), projects(name), deals(deal_number), leases(lease_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportTicket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    conversationId: row.conversation_id,
    subject: row.subject,
    description: row.description,
    categoryCode: row.category_code,
    categoryLabel: row.support_categories?.label ?? undefined,
    departmentId: row.department_id ?? undefined,
    departmentName: row.support_departments?.name ?? undefined,
    assignedStaffId: row.assigned_staff_id ?? undefined,
    assignedStaffName: row.assignee?.name ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.creator?.name ?? undefined,
    source: row.source,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    unitId: row.unit_id ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    leaseId: row.lease_id ?? undefined,
    leaseNumber: row.leases?.lease_number ?? undefined,
    paymentId: row.payment_id ?? undefined,
    priority: row.priority,
    status: row.status,
    slaRuleId: row.sla_rule_id ?? undefined,
    slaResponseDueAt: row.sla_response_due_at ?? undefined,
    slaResolutionDueAt: row.sla_resolution_due_at ?? undefined,
    slaResponseBreached: !!row.sla_response_breached,
    slaResolutionBreached: !!row.sla_resolution_breached,
    firstResponseAt: row.first_response_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    reopenCount: row.reopen_count,
    satisfactionRating: row.satisfaction_rating ?? undefined,
    satisfactionCategory: row.satisfaction_category ?? undefined,
    satisfactionComment: row.satisfaction_comment ?? undefined,
    wouldRecommend: row.would_recommend ?? undefined,
    resolutionSatisfaction: row.resolution_satisfaction ?? undefined,
    feedbackSubmittedAt: row.feedback_submitted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** customer_id references auth.users, not customer_profiles, so it
 *  can't be embedded in the select — same batch-lookup pattern used by
 *  landlordService/tenantService throughout this codebase. */
async function attachCustomerNames(tickets: SupportTicket[]): Promise<SupportTicket[]> {
  const ids = Array.from(new Set(tickets.map((t) => t.customerId).filter((id): id is string => !!id)));
  if (ids.length === 0) return tickets;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("id, full_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, c.full_name as string]));
  return tickets.map((t) => (t.customerId ? { ...t, customerName: names.get(t.customerId) } : t));
}

async function notifyAssignee(ticket: SupportTicket, type: Parameters<typeof staffNotificationService.notify>[1], title: string, message: string) {
  if (ticket.assignedStaffId) {
    await staffNotificationService.notify(ticket.assignedStaffId, type, title, message, "support_ticket", ticket.id);
  }
}

async function notifyCustomer(ticket: SupportTicket, type: Parameters<typeof notificationService.notify>[1], title: string, message: string) {
  if (ticket.customerId) {
    await notificationService.notify(ticket.customerId, type, title, message, "support_ticket", ticket.id);
  }
}

export const ticketService = {
  async list(filters?: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    departmentId?: string;
    assignedStaffId?: string;
    categoryCode?: string;
    customerId?: string;
    propertyId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ tickets: SupportTicket[]; total: number }> {
    const supabase = await createClient();
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 25));
    let query = supabase.from("support_tickets").select(SELECT, { count: "exact" }).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priority) query = query.eq("priority", filters.priority);
    if (filters?.departmentId) query = query.eq("department_id", filters.departmentId);
    if (filters?.assignedStaffId) query = query.eq("assigned_staff_id", filters.assignedStaffId);
    if (filters?.categoryCode) query = query.eq("category_code", filters.categoryCode);
    if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`ticket_number.ilike.%${q}%,subject.ilike.%${q}%`);
    }
    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("ticketService.list failed:", error);
      return { tickets: [], total: 0 };
    }
    return { tickets: await attachCustomerNames((data ?? []).map(mapRow)), total: count ?? 0 };
  },

  async getById(id: string): Promise<SupportTicket | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_tickets").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [ticket] = await attachCustomerNames([mapRow(data)]);
    return ticket;
  },

  async getByConversationId(conversationId: string): Promise<SupportTicket | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_tickets").select(SELECT).eq("conversation_id", conversationId).maybeSingle();
    if (error || !data) return undefined;
    const [ticket] = await attachCustomerNames([mapRow(data)]);
    return ticket;
  },

  async listForCustomer(customerId: string): Promise<SupportTicket[]> {
    const { tickets } = await this.list({ customerId, pageSize: 100 });
    return tickets;
  },

  /** Creates the ticket's dedicated Communication Center conversation
   *  first (never a new messaging system), posts the description as
   *  the conversation's first message, resolves routing/SLA, and
   *  notifies the fallback/target department. Customer-initiated
   *  (customerId set, createdBy absent) or staff-initiated on a
   *  customer's behalf (createdBy set) — never both unset. */
  async create(input: SupportTicketInput, actor: { customerId?: string; customerName?: string; adminId?: string; adminName?: string }): Promise<SupportTicket> {
    if (!actor.customerId && !actor.adminId) throw new Error("A ticket must be created by either a customer or a staff member.");
    const supabase = await createClient();

    const categories = await supportCategoryService.list();
    const category = categories.find((c) => c.code === input.categoryCode);
    if (!category) throw new Error("Unknown ticket category.");
    const settings = await supportSettingsService.get();
    const departmentId = category.defaultDepartmentId ?? settings.defaultDepartmentId;

    const conversation = await communicationService.create({
      channel: "PORTAL",
      subject: input.subject,
      customerId: actor.customerId ?? input.customerId,
      propertyId: input.propertyId,
      projectId: input.projectId,
      dealId: input.dealId,
      paymentId: input.paymentId,
    });

    const priority = input.priority ?? "NORMAL";
    const { ruleId, responseDueAt, resolutionDueAt } = await supportSlaService.computeDueDates(priority, departmentId, input.categoryCode, new Date());

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        conversation_id: conversation.id,
        subject: input.subject,
        description: input.description,
        category_code: input.categoryCode,
        department_id: departmentId || null,
        customer_id: actor.customerId ?? input.customerId ?? null,
        created_by: actor.adminId || null,
        source: input.source ?? (actor.adminId ? "ADMIN" : "PORTAL"),
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        unit_id: input.unitId || null,
        deal_id: input.dealId || null,
        lease_id: input.leaseId || null,
        payment_id: input.paymentId || null,
        priority,
        sla_rule_id: ruleId || null,
        sla_response_due_at: responseDueAt || null,
        sla_resolution_due_at: resolutionDueAt || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("ticketService.create failed:", error);
      throw new Error("Could not create this ticket.");
    }
    const [ticket] = await attachCustomerNames([mapRow(data)]);

    // First message = the ticket's own description, so the
    // conversation timeline always starts with it.
    if (actor.customerId) {
      await communicationService.customerReply(conversation.id, actor.customerId, actor.customerName ?? "Customer", input.description);
    } else if (actor.adminId) {
      await communicationService.composeAndSend({ conversationId: conversation.id, channel: "PORTAL", direction: "INTERNAL", body: `Ticket opened on behalf of the customer: ${input.description}`, isPrivateNote: true }, { adminId: actor.adminId, name: actor.adminName ?? "Staff" });
    }

    await supportAuditService.log({ entityType: "support_ticket", entityId: ticket.id, action: "Created", actorId: actor.adminId, actorName: actor.adminName ?? actor.customerName, newValue: { ticketNumber: ticket.ticketNumber, categoryCode: ticket.categoryCode } });

    if (departmentId) {
      const supabase2 = await createClient();
      const { data: staff } = await supabase2.from("support_department_staff").select("admin_id").eq("department_id", departmentId);
      for (const s of staff ?? []) {
        await staffNotificationService.notify(s.admin_id, "support_ticket_created", "New support ticket", `${ticket.ticketNumber}: ${ticket.subject}`, "support_ticket", ticket.id);
      }
    }
    return ticket;
  },

  async assign(ticketId: string, input: { departmentId?: string | null; assignedStaffId?: string | null }, actorId: string, actorName: string): Promise<SupportTicket> {
    const current = await this.getById(ticketId);
    if (!current) throw new Error("Ticket not found.");
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.departmentId !== undefined) row.department_id = input.departmentId;
    if (input.assignedStaffId !== undefined) {
      row.assigned_staff_id = input.assignedStaffId;
      if (input.assignedStaffId && current.status === "NEW") row.status = "ASSIGNED";
    }
    const { data, error } = await supabase.from("support_tickets").update(row).eq("id", ticketId).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not assign this ticket.");
    const [ticket] = await attachCustomerNames([mapRow(data)]);
    await supportAuditService.log({ entityType: "support_ticket", entityId: ticketId, action: "Assigned", actorId, actorName, oldValue: { departmentId: current.departmentId, assignedStaffId: current.assignedStaffId }, newValue: input });
    if (input.assignedStaffId && input.assignedStaffId !== current.assignedStaffId) {
      await notifyAssignee(ticket, "support_ticket_assigned", "Ticket assigned to you", `${ticket.ticketNumber}: ${ticket.subject}`);
    }
    return ticket;
  },

  async updateStatus(ticketId: string, nextStatus: SupportTicketStatus, actorId: string, actorName: string): Promise<SupportTicket> {
    const current = await this.getById(ticketId);
    if (!current) throw new Error("Ticket not found.");
    if (!SUPPORT_TICKET_ALLOWED_TRANSITIONS[current.status]?.includes(nextStatus)) {
      throw new Error(`Cannot move a ticket from "${current.status}" to "${nextStatus}".`);
    }
    const supabase = await createClient();
    const row: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "RESOLVED") row.resolved_at = new Date().toISOString();
    if (nextStatus === "CLOSED") row.closed_at = new Date().toISOString();
    if (nextStatus === "REOPENED") row.reopen_count = current.reopenCount + 1;
    const { data, error } = await supabase.from("support_tickets").update(row).eq("id", ticketId).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this ticket's status.");
    const [ticket] = await attachCustomerNames([mapRow(data)]);
    await supportAuditService.log({ entityType: "support_ticket", entityId: ticketId, action: `Status changed to ${nextStatus}`, actorId, actorName, oldValue: { status: current.status }, newValue: { status: nextStatus } });

    if (nextStatus === "RESOLVED") {
      await notifyCustomer(ticket, "support_ticket_resolved", "Your ticket has been resolved", `${ticket.ticketNumber}: ${ticket.subject}`);
      await notifyCustomer(ticket, "support_ticket_satisfaction_request", "How did we do?", `Please rate your experience for ${ticket.ticketNumber}.`);
    } else if (nextStatus === "CLOSED") {
      await notifyCustomer(ticket, "support_ticket_closed", "Your ticket has been closed", `${ticket.ticketNumber}: ${ticket.subject}`);
    } else {
      await notifyCustomer(ticket, "support_ticket_status_changed", "Ticket status updated", `${ticket.ticketNumber} is now ${nextStatus.replace(/_/g, " ")}.`);
    }
    return ticket;
  },

  /** The customer's own REOPENED request — runs under their own
   *  session so the protect_support_ticket_customer_fields trigger
   *  enforces they can only do exactly this. */
  async requestReopen(ticketId: string, customerId: string, customerName: string): Promise<SupportTicket> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_tickets").update({ status: "REOPENED" }).eq("id", ticketId).eq("customer_id", customerId).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not reopen this ticket.");
    const [ticket] = await attachCustomerNames([mapRow(data)]);
    await supportAuditService.log({ entityType: "support_ticket", entityId: ticketId, action: "Reopened by customer", actorName: customerName });
    await notifyAssignee(ticket, "support_ticket_customer_reply", "Ticket reopened by customer", `${ticket.ticketNumber}: ${ticket.subject}`);
    return ticket;
  },

  async recordFirstResponseIfNeeded(ticketId: string): Promise<void> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("first_response_at, sla_response_due_at").eq("id", ticketId).maybeSingle();
    if (!data || data.first_response_at) return;
    const now = new Date();
    const breached = data.sla_response_due_at ? now > new Date(data.sla_response_due_at) : false;
    await supabase.from("support_tickets").update({ first_response_at: now.toISOString(), sla_response_breached: breached }).eq("id", ticketId);
  },

  /** Staff reply — delegates entirely to the EXISTING
   *  communicationService.composeAndSend(); isPrivateNote makes it an
   *  internal note customers never see (already enforced by RLS). */
  async staffReply(ticketId: string, body: string, isPrivateNote: boolean, actor: { adminId: string; name: string }) {
    const ticket = await this.getById(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    const message = await communicationService.composeAndSend({ conversationId: ticket.conversationId, channel: "PORTAL", direction: isPrivateNote ? "INTERNAL" : "OUTBOUND", body, isPrivateNote }, actor);
    if (!isPrivateNote) {
      await this.recordFirstResponseIfNeeded(ticketId);
      await notifyCustomer(ticket, "support_ticket_staff_reply", "New reply on your ticket", `${ticket.ticketNumber}: ${body.slice(0, 140)}`);
    }
    await supportAuditService.log({ entityType: "support_ticket", entityId: ticketId, action: isPrivateNote ? "Internal note added" : "Staff replied", actorId: actor.adminId, actorName: actor.name });
    return message;
  },

  /** Customer reply — delegates to communicationService.customerReply()
   *  and moves a WAITING_FOR_CUSTOMER ticket back into the active
   *  queue automatically. */
  async customerReply(ticketId: string, customerId: string, customerName: string, body: string) {
    const ticket = await this.getById(ticketId);
    if (!ticket || ticket.customerId !== customerId) throw new Error("Ticket not found.");
    const message = await communicationService.customerReply(ticket.conversationId, customerId, customerName, body);
    if (ticket.status === "WAITING_FOR_CUSTOMER") {
      await this.updateStatus(ticketId, "IN_PROGRESS", customerId, customerName).catch(() => undefined);
    }
    await notifyAssignee(ticket, "support_ticket_customer_reply", "Customer replied", `${ticket.ticketNumber}: ${body.slice(0, 140)}`);
    return message;
  },

  async submitFeedback(ticketId: string, customerId: string, input: SupportTicketFeedbackInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("support_tickets")
      .update({
        satisfaction_rating: input.satisfactionRating,
        satisfaction_category: input.satisfactionCategory || null,
        satisfaction_comment: input.satisfactionComment || null,
        would_recommend: input.wouldRecommend ?? null,
        resolution_satisfaction: input.resolutionSatisfaction || null,
        feedback_submitted_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("customer_id", customerId);
    if (error) throw new Error("Could not submit your feedback.");
  },

  /** No background job runner exists anywhere in this codebase (same
   *  disclosed limitation as every prior step's automation section) —
   *  this is a manually-triggered (or admin-page-load-triggered) sweep
   *  rather than a real scheduled job. Idempotent: a ticket already
   *  marked breached is never re-notified. */
  async sweepSlaBreaches(): Promise<{ responseBreaches: number; resolutionBreaches: number }> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data: responseOverdue } = await supabase
      .from("support_tickets")
      .select(SELECT)
      .eq("sla_response_breached", false)
      .is("first_response_at", null)
      .not("sla_response_due_at", "is", null)
      .lt("sla_response_due_at", now)
      .not("status", "in", "(RESOLVED,CLOSED,CANCELLED)");
    for (const row of responseOverdue ?? []) {
      const ticket = mapRow(row);
      await supabase.from("support_tickets").update({ sla_response_breached: true }).eq("id", ticket.id);
      await notifyAssignee(ticket, "support_ticket_sla_breached", "SLA response breached", `${ticket.ticketNumber}: first response is overdue.`);
    }

    const { data: resolutionOverdue } = await supabase
      .from("support_tickets")
      .select(SELECT)
      .eq("sla_resolution_breached", false)
      .not("sla_resolution_due_at", "is", null)
      .lt("sla_resolution_due_at", now)
      .not("status", "in", "(RESOLVED,CLOSED,CANCELLED)");
    for (const row of resolutionOverdue ?? []) {
      const ticket = mapRow(row);
      await supabase.from("support_tickets").update({ sla_resolution_breached: true }).eq("id", ticket.id);
      await notifyAssignee(ticket, "support_ticket_sla_breached", "SLA resolution breached", `${ticket.ticketNumber}: resolution is overdue.`);
    }
    return { responseBreaches: responseOverdue?.length ?? 0, resolutionBreaches: resolutionOverdue?.length ?? 0 };
  },
};
