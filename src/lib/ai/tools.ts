import "server-only";
import { tool, type Tool } from "ai";
import { z } from "zod";
import { aiToolService, type ToolContext } from "@/services/aiToolService";
import type { AiToolName } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any, any>;

/** Wraps aiToolService in AI-SDK `tool()` definitions, restricted to
 *  the tool names the caller resolved as allowed for this actor +
 *  assistant (already intersected: hard ceiling ∩ admin config ∩
 *  per-request context). The model only ever sees the tools passed
 *  here — never the full aiToolService surface. */
export function buildToolSet(ctx: ToolContext, allowed: Set<AiToolName>) {
  const all: Partial<Record<AiToolName, AnyTool>> = {
    search_properties: tool({
      description: "Search real, authorized property listings by filters. Never invents listings.",
      inputSchema: z.object({
        q: z.string().optional(),
        purpose: z.enum(["Sale", "Rent"]).optional(),
        type: z.string().optional(),
        city: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (input: any) => aiToolService.search_properties(ctx, input),
    }),
    get_property_details: tool({
      description: "Get full details for one property by its ID.",
      inputSchema: z.object({ propertyId: z.string() }),
      execute: async ({ propertyId }) => aiToolService.get_property_details(ctx, propertyId),
    }),
    search_leads: tool({
      description: "Search CRM leads (staff only).",
      inputSchema: z.object({ q: z.string().optional(), status: z.string().optional(), assignedAgentId: z.string().optional() }),
      execute: async (input) => aiToolService.search_leads(ctx, input),
    }),
    get_lead_summary: tool({
      description: "Get one lead's summary, including missing info for follow-up (staff only).",
      inputSchema: z.object({ leadId: z.string() }),
      execute: async ({ leadId }) => aiToolService.get_lead_summary(ctx, leadId),
    }),
    get_customer_summary: tool({
      description: "Get a customer's basic profile (own record for a customer; any for staff).",
      inputSchema: z.object({ customerId: z.string() }),
      execute: async ({ customerId }) => aiToolService.get_customer_summary(ctx, customerId),
    }),
    get_deal_summary: tool({
      description: "Get a sales deal's summary (staff only).",
      inputSchema: z.object({ dealId: z.string() }),
      execute: async ({ dealId }) => aiToolService.get_deal_summary(ctx, dealId),
    }),
    get_rental_summary: tool({
      description: "List leases (a customer sees only their own).",
      inputSchema: z.object({ rentalPropertyId: z.string().optional() }),
      execute: async ({ rentalPropertyId }) => aiToolService.get_rental_summary(ctx, rentalPropertyId),
    }),
    get_lease_summary: tool({
      description: "Get one lease's details by ID.",
      inputSchema: z.object({ leaseId: z.string() }),
      execute: async ({ leaseId }) => aiToolService.get_lease_summary(ctx, leaseId),
    }),
    get_payment_status: tool({
      description: "Get confirmed rent payment records for a lease. Never a guarantee of future payment.",
      inputSchema: z.object({ leaseId: z.string() }),
      execute: async ({ leaseId }) => aiToolService.get_payment_status(ctx, leaseId),
    }),
    get_support_ticket: tool({
      description: "Get a support ticket's status/metadata (own ticket for a customer).",
      inputSchema: z.object({ ticketId: z.string() }),
      execute: async ({ ticketId }) => aiToolService.get_support_ticket(ctx, ticketId),
    }),
    search_knowledge_base: tool({
      description: "Search the approved, published support knowledge base / FAQ.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => aiToolService.search_knowledge_base(ctx, query),
    }),
    get_construction_project_summary: tool({
      description: "Get one construction project's progress summary, or list projects (staff) if no ID given.",
      inputSchema: z.object({ projectId: z.string().optional() }),
      execute: async ({ projectId }) => aiToolService.get_construction_project_summary(ctx, projectId),
    }),
    get_maintenance_summary: tool({
      description: "List maintenance requests (a customer sees only their own).",
      inputSchema: z.object({ propertyId: z.string().optional() }),
      execute: async ({ propertyId }) => aiToolService.get_maintenance_summary(ctx, propertyId),
    }),
    get_business_dashboard_summary: tool({
      description: "Get the current business analytics dashboard overview (staff only).",
      inputSchema: z.object({}),
      execute: async () => aiToolService.get_business_dashboard_summary(ctx),
    }),
    generate_report_summary: tool({
      description: "Get an accounting or analytics report summary (staff only). Always ACTUAL data, never a forecast unless labeled.",
      inputSchema: z.object({ scope: z.enum(["accounting", "analytics"]) }),
      execute: async ({ scope }) => aiToolService.generate_report_summary(ctx, scope),
    }),
  };

  const out: Record<string, AnyTool> = {};
  for (const name of allowed) {
    if (all[name]) out[name] = all[name]!;
  }
  return out;
}
