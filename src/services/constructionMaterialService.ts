import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { MATERIAL_REQUEST_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionMaterial, ConstructionMaterialInput, ConstructionMaterialMovement, MaterialMovementType, ConstructionMaterialRequest, ConstructionMaterialRequestInput, MaterialRequestStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMaterialRow(row: any): ConstructionMaterial {
  const received = Number(row.received_quantity);
  const used = Number(row.used_quantity);
  return {
    id: row.id,
    materialCode: row.material_code,
    projectId: row.project_id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    requiredQuantity: Number(row.required_quantity),
    orderedQuantity: Number(row.ordered_quantity),
    receivedQuantity: received,
    usedQuantity: used,
    remainingQuantity: received - used,
    reorderThreshold: row.reorder_threshold != null ? Number(row.reorder_threshold) : undefined,
    estimatedRate: row.estimated_rate != null ? Number(row.estimated_rate) : undefined,
    actualRate: row.actual_rate != null ? Number(row.actual_rate) : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMovementRow(row: any): ConstructionMaterialMovement {
  return {
    id: row.id,
    materialId: row.material_id,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRequestRow(row: any): ConstructionMaterialRequest {
  return {
    id: row.id,
    requestNumber: row.request_number,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    materialId: row.material_id ?? undefined,
    materialName: row.construction_materials?.name ?? row.material_name ?? undefined,
    requestedByName: row.admin_profiles?.name ?? undefined,
    quantity: Number(row.quantity),
    requiredDate: row.required_date ?? undefined,
    priority: row.priority,
    reason: row.reason ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertRequestTransition(from: MaterialRequestStatus, to: MaterialRequestStatus) {
  if (!MATERIAL_REQUEST_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a material request from ${from} to ${to}.`);
  }
}

export const constructionMaterialService = {
  async list(projectId: string): Promise<ConstructionMaterial[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_materials").select("*").eq("project_id", projectId).order("name", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapMaterialRow);
  },

  async getById(id: string): Promise<ConstructionMaterial | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_materials").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapMaterialRow(data);
  },

  async create(projectId: string, input: ConstructionMaterialInput, actorId: string): Promise<ConstructionMaterial> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_materials")
      .insert({
        project_id: projectId,
        material_code: input.materialCode,
        name: input.name,
        category: input.category,
        unit: input.unit,
        required_quantity: input.requiredQuantity ?? 0,
        reorder_threshold: input.reorderThreshold ?? null,
        estimated_rate: input.estimatedRate ?? null,
        actual_rate: input.actualRate ?? null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("constructionMaterialService.create failed:", error);
      if (error.code === "23505") throw new Error("A material with this code already exists for this project.");
      throw new Error("Could not create this material.");
    }
    return mapMaterialRow(data);
  },

  async update(id: string, input: Partial<ConstructionMaterialInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.category !== undefined) row.category = input.category;
    if (input.unit !== undefined) row.unit = input.unit;
    if (input.requiredQuantity !== undefined) row.required_quantity = input.requiredQuantity;
    if (input.reorderThreshold !== undefined) row.reorder_threshold = input.reorderThreshold;
    if (input.estimatedRate !== undefined) row.estimated_rate = input.estimatedRate;
    if (input.actualRate !== undefined) row.actual_rate = input.actualRate;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("construction_materials").update(row).eq("id", id);
    if (error) throw new Error("Could not update this material.");
  },

  // ---- Movements (section 15) — every quantity column recomputed from
  // the movement, never edited directly, so history stays authoritative. ----
  async listMovements(materialId: string): Promise<ConstructionMaterialMovement[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_material_movements").select("*, admin_profiles(name)").eq("material_id", materialId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapMovementRow);
  },

  async recordMovement(materialId: string, movementType: MaterialMovementType, quantity: number, actorId: string, reference?: string, notes?: string): Promise<void> {
    const material = await this.getById(materialId);
    if (!material) throw new Error("Material not found.");
    if (quantity === 0) throw new Error("Movement quantity cannot be zero.");
    if (movementType !== "ADJUSTED" && quantity < 0) throw new Error("Only an ADJUSTED movement may use a negative quantity.");

    const supabase = await createClient();
    const { error: insertError } = await supabase.from("construction_material_movements").insert({ material_id: materialId, movement_type: movementType, quantity, reference: reference || null, notes: notes || null, created_by: actorId });
    if (insertError) throw new Error("Could not record this material movement.");

    const updates: Record<string, number> = {};
    if (movementType === "ORDERED") updates.ordered_quantity = material.orderedQuantity + quantity;
    else if (movementType === "RECEIVED") updates.received_quantity = material.receivedQuantity + quantity;
    else if (movementType === "ISSUED") {
      if (material.remainingQuantity - quantity < 0) throw new Error("Insufficient stock — this issue would take remaining quantity negative.");
      updates.used_quantity = material.usedQuantity + quantity;
    } else if (movementType === "RETURNED") {
      updates.used_quantity = Math.max(0, material.usedQuantity - quantity);
    } else if (movementType === "ADJUSTED") {
      updates.received_quantity = Math.max(0, material.receivedQuantity + quantity);
    }
    await supabase.from("construction_materials").update(updates).eq("id", materialId);
  },

  // ---- Material requests (section 16) ----
  async listRequests(projectId: string): Promise<ConstructionMaterialRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_material_requests")
      .select("*, construction_phases(name), construction_materials(name), admin_profiles(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRequestRow);
  },

  async createRequest(projectId: string, input: ConstructionMaterialRequestInput, actorId: string): Promise<ConstructionMaterialRequest> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_material_requests")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        material_id: input.materialId || null,
        material_name: input.materialName || null,
        requested_by: actorId,
        quantity: input.quantity,
        required_date: input.requiredDate || null,
        priority: input.priority ?? "NORMAL",
        reason: input.reason || null,
        status: "SUBMITTED",
      })
      .select("*, construction_phases(name), construction_materials(name), admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionMaterialService.createRequest failed:", error);
      throw new Error("Could not create this material request.");
    }
    const request = mapRequestRow(data);
    await constructionAuditService.log({ entityType: "material_request", entityId: request.id, action: "Submitted", actorId, newValue: { quantity: request.quantity } });
    return request;
  },

  async updateRequestStatus(id: string, status: MaterialRequestStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("construction_material_requests").select("status").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Material request not found.");
    assertRequestTransition(existing.status, status);
    const { error } = await supabase.from("construction_material_requests").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this request's status.");
    await constructionAuditService.log({ entityType: "material_request", entityId: id, action: `Status changed to ${status}`, actorId, actorName, oldValue: { status: existing.status } });
  },
};
