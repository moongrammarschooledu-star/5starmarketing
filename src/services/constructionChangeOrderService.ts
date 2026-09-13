import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { constructionProjectService } from "./constructionProjectService";
import { CHANGE_ORDER_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionChangeOrder, ConstructionChangeOrderInput, ChangeOrderStatus, ChangeOrderImpactSummary } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionChangeOrder {
  return {
    id: row.id,
    changeOrderNumber: row.change_order_number,
    projectId: row.project_id,
    description: row.description,
    reason: row.reason ?? undefined,
    requestedByName: row.requested?.name ?? undefined,
    costImpact: Number(row.cost_impact),
    scheduleImpactDays: row.schedule_impact_days,
    status: row.status,
    approvedByName: row.approved?.name ?? undefined,
    approvalDate: row.approval_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = "*, requested:admin_profiles!construction_change_orders_requested_by_fkey(name), approved:admin_profiles!construction_change_orders_approved_by_fkey(name)";

function assertTransition(from: ChangeOrderStatus, to: ChangeOrderStatus) {
  if (!CHANGE_ORDER_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a change order from ${from} to ${to}.`);
  }
}

export const constructionChangeOrderService = {
  async list(projectId: string): Promise<ConstructionChangeOrder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_change_orders").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<ConstructionChangeOrder | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_change_orders").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(projectId: string, input: ConstructionChangeOrderInput, actorId: string, actorName: string): Promise<ConstructionChangeOrder> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_change_orders")
      .insert({ project_id: projectId, description: input.description, reason: input.reason || null, requested_by: actorId, cost_impact: input.costImpact ?? 0, schedule_impact_days: input.scheduleImpactDays ?? 0 })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionChangeOrderService.create failed:", error);
      throw new Error("Could not create this change order.");
    }
    const co = mapRow(data);
    await constructionAuditService.log({ entityType: "change_order", entityId: co.id, action: "Created", actorId, actorName, newValue: { costImpact: co.costImpact } });
    return co;
  },

  async updateStatus(id: string, newStatus: ChangeOrderStatus, actorId: string, actorName: string): Promise<ConstructionChangeOrder> {
    const co = await this.getById(id);
    if (!co) throw new Error("Change order not found.");
    assertTransition(co.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "APPROVED") {
      extra.approved_by = actorId;
      extra.approval_date = new Date().toISOString().slice(0, 10);
    }
    const { data, error } = await supabase.from("construction_change_orders").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this change order's status.");
    await constructionAuditService.log({ entityType: "change_order", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: co.status } });
    return mapRow(data);
  },

  /** Section 27 — revised figures are ALWAYS computed live from
   *  APPROVED/IMPLEMENTED change orders; the project's own contract_value
   *  and planned_completion_date are never mutated automatically. */
  async impactSummary(projectId: string): Promise<ChangeOrderImpactSummary> {
    const [project, changeOrders] = await Promise.all([constructionProjectService.getById(projectId), this.list(projectId)]);
    const approved = changeOrders.filter((c) => c.status === "APPROVED" || c.status === "IMPLEMENTED");
    const approvedCostChanges = approved.reduce((sum, c) => sum + c.costImpact, 0);
    const approvedScheduleChangeDays = approved.reduce((sum, c) => sum + c.scheduleImpactDays, 0);

    const originalContractValue = project?.contractValue ?? null;
    const revisedContractValue = originalContractValue != null ? originalContractValue + approvedCostChanges : null;
    const originalCompletionDate = project?.plannedCompletionDate ?? null;
    const revisedCompletionDate = originalCompletionDate ? new Date(new Date(originalCompletionDate).getTime() + approvedScheduleChangeDays * 86400000).toISOString().slice(0, 10) : null;

    return { originalContractValue, approvedCostChanges, revisedContractValue, originalCompletionDate, approvedScheduleChangeDays, revisedCompletionDate };
  },
};
