import "server-only";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import { DEFECT_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import type { PropertyDefect, PropertyDefectInput, DefectStatus } from "@/lib/models/maintenance";

const SELECT = "*, properties(title), maintenance_vendors(business_name), technician:admin_profiles!property_defects_assigned_technician_id_fkey(name), maintenance_work_orders(work_order_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyDefect {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    inspectionId: row.inspection_id ?? undefined,
    checklistResultId: row.checklist_result_id ?? undefined,
    category: row.category,
    description: row.description,
    severity: row.severity,
    location: row.location ?? undefined,
    recommendedAction: row.recommended_action ?? undefined,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : undefined,
    actualCost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    status: row.status,
    assignedVendorId: row.assigned_vendor_id ?? undefined,
    assignedVendorName: row.maintenance_vendors?.business_name ?? undefined,
    assignedTechnicianId: row.assigned_technician_id ?? undefined,
    assignedTechnicianName: row.technician?.name ?? undefined,
    workOrderId: row.work_order_id ?? undefined,
    workOrderNumber: row.maintenance_work_orders?.work_order_number ?? undefined,
    dueDate: row.due_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: DefectStatus, to: DefectStatus) {
  if (!DEFECT_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a defect from ${from} to ${to}.`);
  }
}

export const propertyDefectService = {
  async list(filters?: { propertyId?: string; inspectionId?: string; status?: DefectStatus }): Promise<PropertyDefect[]> {
    const supabase = await createClient();
    let query = supabase.from("property_defects").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.inspectionId) query = query.eq("inspection_id", filters.inspectionId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("propertyDefectService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<PropertyDefect | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_defects").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: PropertyDefectInput, actorId: string, actorName: string): Promise<PropertyDefect> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_defects")
      .insert({
        property_id: input.propertyId,
        inspection_id: input.inspectionId || null,
        checklist_result_id: input.checklistResultId || null,
        category: input.category,
        description: input.description,
        severity: input.severity,
        location: input.location || null,
        recommended_action: input.recommendedAction || null,
        estimated_cost: input.estimatedCost ?? null,
        assigned_vendor_id: input.assignedVendorId || null,
        assigned_technician_id: input.assignedTechnicianId || null,
        due_date: input.dueDate || null,
        status: input.assignedVendorId || input.assignedTechnicianId ? "ASSIGNED" : "OPEN",
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("propertyDefectService.create failed:", error);
      throw new Error("Could not create this defect.");
    }
    const defect = mapRow(data);
    await maintenanceAuditService.log({ entityType: "defect", entityId: defect.id, action: "Created", actorId, actorName, newValue: { severity: defect.severity, category: defect.category } });
    return defect;
  },

  async updateStatus(id: string, newStatus: DefectStatus, actorId: string, actorName: string): Promise<PropertyDefect> {
    const defect = await this.getById(id);
    if (!defect) throw new Error("Defect not found.");
    assertTransition(defect.status, newStatus);
    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "RESOLVED") extra.completed_date = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("property_defects").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this defect's status.");
    await maintenanceAuditService.log({ entityType: "defect", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: defect.status } });
    return mapRow(data);
  },

  async linkWorkOrder(id: string, workOrderId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_defects").update({ work_order_id: workOrderId, status: "ASSIGNED" }).eq("id", id);
    if (error) throw new Error("Could not link this defect to a work order.");
  },

  async setActualCost(id: string, actualCost: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_defects").update({ actual_cost: actualCost }).eq("id", id);
    if (error) throw new Error("Could not update this defect's actual cost.");
  },
};
