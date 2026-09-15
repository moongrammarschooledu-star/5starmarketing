import "server-only";
import { propertyService } from "./propertyService";
import { leadService } from "./leadService";
import { customerService } from "./customerService";
import { dealService } from "./dealService";
import { leaseService } from "./leaseService";
import { rentPaymentService } from "./rentPaymentService";
import { ticketService } from "./ticketService";
import { kbService } from "./kbService";
import { constructionProjectService } from "./constructionProjectService";
import { maintenanceRequestService } from "./maintenanceRequestService";
import { accountingReportService } from "./accountingReportService";
import { analyticsService } from "./analyticsService";
import { aiAuditService } from "./aiAuditService";
import type { AiActor, AiToolName, AssistantType } from "@/lib/models/ai";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";

/** Which tools each assistant type is even categorically allowed to
 *  reach for — the per-row `allowed_tools` in ai_assistant_configs is
 *  the admin-configurable subset of this; this map is the hard ceiling
 *  that admin settings can only narrow, never widen. */
const ASSISTANT_TOOL_CEILING: Record<AssistantType, AiToolName[]> = {
  ADMIN: [
    "search_properties", "get_property_details", "search_leads", "get_lead_summary", "get_customer_summary",
    "get_deal_summary", "get_rental_summary", "get_lease_summary", "get_payment_status", "get_support_ticket",
    "search_knowledge_base", "get_construction_project_summary", "get_maintenance_summary",
    "get_business_dashboard_summary", "generate_report_summary",
  ],
  SALES: ["search_properties", "get_property_details", "search_leads", "get_lead_summary", "get_customer_summary", "get_deal_summary", "search_knowledge_base"],
  SUPPORT: ["get_support_ticket", "search_knowledge_base", "get_customer_summary"],
  RENTAL: ["search_properties", "get_property_details", "get_rental_summary", "get_lease_summary", "get_payment_status"],
  CONSTRUCTION: ["get_construction_project_summary", "get_maintenance_summary"],
  ACCOUNTING: ["get_payment_status", "generate_report_summary", "get_business_dashboard_summary"],
  CUSTOMER_PORTAL: ["search_properties", "get_property_details", "search_knowledge_base", "get_support_ticket", "get_rental_summary", "get_lease_summary"],
};

export interface ToolContext {
  actor: AiActor;
  assistantType: AssistantType;
  allowedTools: string[]; // from ai_assistant_configs, already intersected with the ceiling by the caller
  conversationId?: string;
}

export class ToolAuthorizationError extends Error {}

function assertToolAllowed(ctx: ToolContext, tool: AiToolName) {
  const ceiling = ASSISTANT_TOOL_CEILING[ctx.assistantType] ?? [];
  if (!ceiling.includes(tool) || !ctx.allowedTools.includes(tool)) {
    throw new ToolAuthorizationError(`Tool "${tool}" is not permitted for the ${ctx.assistantType} assistant.`);
  }
}

/** Customers may only ever see their OWN records. This is enforced here
 *  (defense in depth) in addition to Postgres RLS on the underlying
 *  tables — never rely on a single layer for authorization. */
function assertCustomerOwnsOrThrow(ctx: ToolContext, ownerCustomerId: string | undefined) {
  if (ctx.actor.kind === "customer" && ownerCustomerId !== ctx.actor.id) {
    throw new ToolAuthorizationError("You are not authorized to view this record.");
  }
}

async function withLog<T>(ctx: ToolContext, tool: AiToolName, input: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    assertToolAllowed(ctx, tool);
    const result = await fn();
    await aiAuditService.logToolCall({
      conversationId: ctx.conversationId,
      actor: ctx.actor,
      assistantType: ctx.assistantType,
      toolName: tool,
      input,
      status: "SUCCESS",
      durationMs: Date.now() - start,
    });
    return result;
  } catch (err) {
    const denied = err instanceof ToolAuthorizationError;
    await aiAuditService.logToolCall({
      conversationId: ctx.conversationId,
      actor: ctx.actor,
      assistantType: ctx.assistantType,
      toolName: tool,
      input,
      status: denied ? "DENIED" : "ERROR",
      errorMessage: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

const MAX_LIST = 15;

/** The AI TOOLS layer (spec section "AI TOOLS"). Every function:
 *   1. Validates input (implicitly via TypeScript + narrow filter shape)
 *   2. Is only reachable after authentication resolved `ctx.actor`
 *   3. Checks role/assistant/tool authorization before touching data
 *   4. Retrieves ONLY authorized, minimized data (never `select *` fan-out)
 *   5. Returns structured (never freeform) data
 *   6. Logs the access via withLog()
 * Never call Supabase directly here — always go through the same
 * services/ layer every other STEP's server actions use, so RLS +
 * business rules stay single-sourced. */
export const aiToolService = {
  async search_properties(ctx: ToolContext, filters: PropertySearchFilters) {
    return withLog(ctx, "search_properties", { filters }, async () => {
      const result = await propertyService.search({ ...filters, page: 1, pageSize: MAX_LIST } as PropertySearchFilters);
      const items = result.properties.slice(0, MAX_LIST).map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        purpose: p.purpose,
        city: p.city,
        location: p.location,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        size: p.size,
        status: p.status,
      }));
      return { total: result.total, items, note: items.length === 0 ? "No authorized properties matched these criteria." : undefined };
    });
  },

  async get_property_details(ctx: ToolContext, propertyId: string) {
    return withLog(ctx, "get_property_details", { propertyId }, async () => {
      const p = await propertyService.getById(propertyId);
      if (!p) return { found: false as const };
      return {
        found: true as const,
        id: p.id,
        title: p.title,
        type: p.type,
        purpose: p.purpose,
        city: p.city,
        location: p.location,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        size: p.size,
        status: p.status,
        amenities: p.amenities,
        description: p.description,
      };
    });
  },

  async search_leads(ctx: ToolContext, filters: { q?: string; status?: string; assignedAgentId?: string }) {
    if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may search leads.");
    return withLog(ctx, "search_leads", { filters }, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await leadService.search(filters as any);
      const items = result.leads.slice(0, MAX_LIST).map((l) => ({
        id: l.id, name: l.name, phone: l.phone, status: l.status, source: l.source,
        propertyId: l.propertyId, propertyTitle: l.propertyTitle, nextFollowUpDate: l.nextFollowUpDate, assignedAgentId: l.assignedAgentId,
      }));
      return { total: result.total, items };
    });
  },

  async get_lead_summary(ctx: ToolContext, leadId: string) {
    if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may view lead detail.");
    return withLog(ctx, "get_lead_summary", { leadId }, async () => {
      const lead = await leadService.getById(leadId);
      if (!lead) return { found: false as const };
      const missing: string[] = [];
      if (!lead.email) missing.push("email");
      if (!lead.propertyId) missing.push("property of interest");
      if (!lead.nextFollowUpDate) missing.push("next follow-up date");
      return {
        found: true as const,
        id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, status: lead.status,
        source: lead.source, message: lead.message, propertyTitle: lead.propertyTitle,
        nextFollowUpDate: lead.nextFollowUpDate, assignedTo: lead.assignedTo,
        missingInfo: missing,
      };
    });
  },

  async get_customer_summary(ctx: ToolContext, customerId: string) {
    assertCustomerOwnsOrThrow(ctx, customerId);
    return withLog(ctx, "get_customer_summary", { customerId }, async () => {
      const c = await customerService.getByIdForAdmin(customerId);
      if (!c) return { found: false as const };
      return { found: true as const, id: c.id, name: c.fullName, email: c.email, phone: c.phone };
    });
  },

  async get_deal_summary(ctx: ToolContext, dealId: string) {
    if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may view deal detail.");
    return withLog(ctx, "get_deal_summary", { dealId }, async () => {
      const d = await dealService.getById(dealId);
      if (!d) return { found: false as const };
      return {
        found: true as const, id: d.id, dealNumber: d.dealNumber, status: d.status, dealType: d.dealType,
        finalAmount: d.finalAmount, receivedAmount: d.receivedAmount, outstandingAmount: d.outstandingAmount,
        bookingStatus: d.bookingStatus,
      };
    });
  },

  async get_rental_summary(ctx: ToolContext, rentalPropertyId?: string) {
    return withLog(ctx, "get_rental_summary", { rentalPropertyId }, async () => {
      const filters = ctx.actor.kind === "customer" ? { tenantId: ctx.actor.id } : rentalPropertyId ? { rentalPropertyId } : undefined;
      const leases = await leaseService.list(filters);
      return {
        items: leases.slice(0, MAX_LIST).map((l) => ({
          id: l.id, leaseNumber: l.leaseNumber, propertyTitle: l.propertyTitle, status: l.status,
          monthlyRent: l.monthlyRent, startDate: l.startDate, endDate: l.endDate,
        })),
      };
    });
  },

  async get_lease_summary(ctx: ToolContext, leaseId: string) {
    return withLog(ctx, "get_lease_summary", { leaseId }, async () => {
      const lease = await leaseService.getById(leaseId);
      if (!lease) return { found: false as const };
      assertCustomerOwnsOrThrow(ctx, lease.tenantId);
      return {
        found: true as const, id: lease.id, leaseNumber: lease.leaseNumber, propertyTitle: lease.propertyTitle,
        status: lease.status, monthlyRent: lease.monthlyRent, startDate: lease.startDate, endDate: lease.endDate,
        paymentDueDay: lease.paymentDueDay, gracePeriodDays: lease.gracePeriodDays,
      };
    });
  },

  async get_payment_status(ctx: ToolContext, leaseId: string) {
    return withLog(ctx, "get_payment_status", { leaseId }, async () => {
      const lease = await leaseService.getById(leaseId);
      if (!lease) return { found: false as const };
      assertCustomerOwnsOrThrow(ctx, lease.tenantId);
      const payments = await rentPaymentService.listForLease(leaseId);
      return {
        found: true as const,
        payments: payments.slice(0, MAX_LIST).map((p) => ({
          id: p.id, paymentNumber: p.paymentNumber, amount: p.amount, status: p.status,
          paymentDate: p.paymentDate, confirmedAt: p.confirmedAt,
        })),
        note: "Only confirmed database records are shown — this is not a payment guarantee.",
      };
    });
  },

  async get_support_ticket(ctx: ToolContext, ticketId: string) {
    return withLog(ctx, "get_support_ticket", { ticketId }, async () => {
      const t = await ticketService.getById(ticketId);
      if (!t) return { found: false as const };
      if (ctx.actor.kind === "customer") assertCustomerOwnsOrThrow(ctx, t.customerId);
      return {
        found: true as const, id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, status: t.status,
        priority: t.priority, categoryLabel: t.categoryLabel, departmentName: t.departmentName,
        // Internal notes stay excluded here by design — this tool returns
        // only ticket metadata; full-thread summarization stays admin-side.
      };
    });
  },

  async search_knowledge_base(ctx: ToolContext, query: string) {
    return withLog(ctx, "search_knowledge_base", { query }, async () => {
      const articles = ctx.actor.kind === "customer" ? await kbService.listPublished(query) : await kbService.listPublished(query);
      return {
        items: articles.slice(0, MAX_LIST).map((a) => ({ id: a.id, title: a.title, question: a.question, answer: a.answer })),
        note: articles.length === 0 ? "No approved knowledge-base article matched this question." : undefined,
      };
    });
  },

  async get_construction_project_summary(ctx: ToolContext, projectId?: string) {
    return withLog(ctx, "get_construction_project_summary", { projectId }, async () => {
      if (projectId) {
        const p = await constructionProjectService.getById(projectId);
        if (!p) return { found: false as const };
        if (ctx.actor.kind === "customer") assertCustomerOwnsOrThrow(ctx, p.customerId);
        return {
          found: true as const, id: p.id, projectNumber: p.projectNumber, projectName: p.projectName,
          status: p.status, plannedCompletionDate: p.plannedCompletionDate, actualCompletionDate: p.actualCompletionDate,
        };
      }
      if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may list all projects.");
      const projects = await constructionProjectService.list();
      return { items: projects.slice(0, MAX_LIST).map((p) => ({ id: p.id, projectName: p.projectName, status: p.status, plannedCompletionDate: p.plannedCompletionDate })) };
    });
  },

  async get_maintenance_summary(ctx: ToolContext, propertyId?: string) {
    return withLog(ctx, "get_maintenance_summary", { propertyId }, async () => {
      const items = ctx.actor.kind === "customer"
        ? await maintenanceRequestService.listForCustomer(ctx.actor.id)
        : await maintenanceRequestService.list(propertyId ? { propertyId } : undefined);
      return {
        items: items.slice(0, MAX_LIST).map((m) => ({
          id: m.id, requestNumber: m.requestNumber, category: m.category, priority: m.priority,
          status: m.status, propertyTitle: m.propertyTitle,
        })),
      };
    });
  },

  async get_business_dashboard_summary(ctx: ToolContext) {
    if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may view business dashboards.");
    return withLog(ctx, "get_business_dashboard_summary", {}, async () => {
      const overview = await analyticsService.overview();
      return { overview, dataType: "ACTUAL" as const, asOf: new Date().toISOString() };
    });
  },

  async generate_report_summary(ctx: ToolContext, scope: "accounting" | "analytics") {
    if (ctx.actor.kind !== "admin") throw new ToolAuthorizationError("Only staff may view financial reports.");
    return withLog(ctx, "generate_report_summary", { scope }, async () => {
      if (scope === "accounting") {
        const stats = await accountingReportService.dashboardStats();
        return { scope, dataType: "ACTUAL" as const, stats };
      }
      const overview = await analyticsService.overview();
      return { scope, dataType: "ACTUAL" as const, overview };
    });
  },
};
