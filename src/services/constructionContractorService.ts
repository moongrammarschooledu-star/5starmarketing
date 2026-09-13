import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { CONSTRUCTION_WORK_ORDER_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionContractor, ConstructionContractorInput, ContractorStatus, ConstructionWorkOrder, ConstructionWorkOrderInput, ConstructionWorkOrderStatus } from "@/lib/models/construction";

const CONTRACTOR_SELECT = "*, maintenance_vendors(business_name, phone, email)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContractorRow(row: any): ConstructionContractor {
  return {
    id: row.id,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    vendorName: row.maintenance_vendors?.business_name ?? undefined,
    vendorPhone: row.maintenance_vendors?.phone ?? undefined,
    vendorEmail: row.maintenance_vendors?.email ?? undefined,
    serviceCategory: row.service_category ?? undefined,
    contractValue: row.contract_value != null ? Number(row.contract_value) : undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    status: row.status,
    performanceNotes: row.performance_notes ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkOrderRow(row: any): ConstructionWorkOrder {
  return {
    id: row.id,
    workOrderNumber: row.work_order_number,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    contractorId: row.contractor_id,
    contractorName: row.construction_contractors?.maintenance_vendors?.business_name ?? undefined,
    scope: row.scope,
    contractAmount: row.contract_amount != null ? Number(row.contract_amount) : undefined,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    progress: Number(row.progress),
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertWorkOrderTransition(from: ConstructionWorkOrderStatus, to: ConstructionWorkOrderStatus) {
  if (!CONSTRUCTION_WORK_ORDER_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a work order from ${from} to ${to}.`);
  }
}

export const constructionContractorService = {
  async list(projectId: string): Promise<ConstructionContractor[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_contractors").select(CONTRACTOR_SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapContractorRow);
  },

  async getById(id: string): Promise<ConstructionContractor | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_contractors").select(CONTRACTOR_SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapContractorRow(data);
  },

  async create(projectId: string, input: ConstructionContractorInput, actorId: string, actorName: string): Promise<ConstructionContractor> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_contractors")
      .insert({
        project_id: projectId,
        vendor_id: input.vendorId,
        service_category: input.serviceCategory || null,
        contract_value: input.contractValue ?? null,
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(CONTRACTOR_SELECT)
      .single();
    if (error) {
      console.error("constructionContractorService.create failed:", error);
      throw new Error("Could not engage this contractor.");
    }
    const contractor = mapContractorRow(data);
    await constructionAuditService.log({ entityType: "contractor", entityId: contractor.id, action: "Engaged", actorId, actorName, newValue: { vendorId: input.vendorId, contractValue: input.contractValue } });
    return contractor;
  },

  async setStatus(id: string, status: ContractorStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_contractors").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this contractor's status.");
    await constructionAuditService.log({ entityType: "contractor", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async setPerformanceNotes(id: string, performanceNotes: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_contractors").update({ performance_notes: performanceNotes }).eq("id", id);
    if (error) throw new Error("Could not update performance notes.");
  },

  // ---- Construction work orders (section 20) ----
  async listWorkOrders(projectId: string): Promise<ConstructionWorkOrder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_work_orders")
      .select("*, construction_phases(name), construction_contractors(maintenance_vendors(business_name))")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapWorkOrderRow);
  },

  async createWorkOrder(projectId: string, input: ConstructionWorkOrderInput, actorId: string, actorName: string): Promise<ConstructionWorkOrder> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_work_orders")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        contractor_id: input.contractorId,
        scope: input.scope,
        contract_amount: input.contractAmount ?? null,
        start_date: input.startDate || null,
        due_date: input.dueDate || null,
        created_by: actorId,
      })
      .select("*, construction_phases(name), construction_contractors(maintenance_vendors(business_name))")
      .single();
    if (error) {
      console.error("constructionContractorService.createWorkOrder failed:", error);
      throw new Error("Could not create this work order.");
    }
    const workOrder = mapWorkOrderRow(data);
    await constructionAuditService.log({ entityType: "work_order", entityId: workOrder.id, action: "Created", actorId, actorName, newValue: { scope: workOrder.scope } });
    return workOrder;
  },

  async updateWorkOrderStatus(id: string, status: ConstructionWorkOrderStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("construction_work_orders").select("status").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Work order not found.");
    assertWorkOrderTransition(existing.status, status);
    const extra: Record<string, unknown> = { status };
    if (status === "COMPLETED") extra.progress = 100;
    const { error } = await supabase.from("construction_work_orders").update(extra).eq("id", id);
    if (error) throw new Error("Could not update this work order's status.");
    await constructionAuditService.log({ entityType: "work_order", entityId: id, action: `Status changed to ${status}`, actorId, actorName, oldValue: { status: existing.status } });
  },

  async updateWorkOrderProgress(id: string, progress: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_work_orders").update({ progress: Math.max(0, Math.min(100, progress)) }).eq("id", id);
    if (error) throw new Error("Could not update this work order's progress.");
  },
};
