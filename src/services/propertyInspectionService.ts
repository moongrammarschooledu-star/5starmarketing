import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import { inspectionTemplateService } from "./inspectionTemplateService";
import { parseUploadDataUri, buildStoragePath, uploadDocumentFile, createSignedDocumentUrl } from "@/lib/documentStorage";
import { INSPECTION_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import type { PropertyInspection, PropertyInspectionInput, InspectionStatus, InspectionResult, InspectionResultInput, InspectionPhoto, ConditionRating } from "@/lib/models/maintenance";

const SELECT = "*, properties(title), projects(name), deals(deal_number), agent:admin_profiles!property_inspections_agent_id_fkey(name), inspector:admin_profiles!property_inspections_inspector_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyInspection {
  return {
    id: row.id,
    inspectionNumber: row.inspection_number,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    templateId: row.template_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: undefined,
    agentId: row.agent_id ?? undefined,
    agentName: row.agent?.name ?? undefined,
    inspectorId: row.inspector_id ?? undefined,
    inspectorName: row.inspector?.name ?? undefined,
    inspectionType: row.inspection_type,
    scheduledDate: row.scheduled_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    status: row.status,
    overallCondition: row.overall_condition ?? undefined,
    notes: row.notes ?? undefined,
    recommendations: row.recommendations ?? undefined,
    documentId: row.document_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResultRow(row: any): InspectionResult {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    checklistItemId: row.checklist_item_id ?? undefined,
    category: row.category,
    item: row.item,
    condition: row.condition,
    severity: row.severity ?? undefined,
    notes: row.notes ?? undefined,
    required: !!row.required,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPhotoRow(row: any): InspectionPhoto {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    propertyId: row.property_id,
    checklistResultId: row.checklist_result_id ?? undefined,
    defectId: row.defect_id ?? undefined,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    uploadedByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
  };
}

async function attachCustomerName(inspection: PropertyInspection): Promise<PropertyInspection> {
  if (!inspection.customerId) return inspection;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name").eq("id", inspection.customerId).maybeSingle();
  return data ? { ...inspection, customerName: data.full_name ?? undefined } : inspection;
}

function assertTransition(from: InspectionStatus, to: InspectionStatus) {
  if (!INSPECTION_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move an inspection from ${from} to ${to}.`);
  }
}

export const propertyInspectionService = {
  async list(filters?: { propertyId?: string; inspectorId?: string; customerId?: string; status?: InspectionStatus }): Promise<PropertyInspection[]> {
    const supabase = await createClient();
    let query = supabase.from("property_inspections").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.inspectorId) query = query.eq("inspector_id", filters.inspectorId);
    if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("propertyInspectionService.list failed:", error);
      return [];
    }
    return Promise.all((data ?? []).map((row) => attachCustomerName(mapRow(row))));
  },

  async getById(id: string): Promise<PropertyInspection | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_inspections").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return attachCustomerName(mapRow(data));
  },

  async listByProperty(propertyId: string): Promise<PropertyInspection[]> {
    return this.list({ propertyId });
  },

  async listForCustomer(customerId: string): Promise<PropertyInspection[]> {
    return this.list({ customerId });
  },

  /** Creates the inspection and instantiates its checklist from the
   *  given (or default) template — every item starts NOT_INSPECTED,
   *  never pre-filled with an invented condition. */
  async create(input: PropertyInspectionInput, actorId: string): Promise<PropertyInspection> {
    const supabase = await createClient();
    const templateId = input.templateId ?? (await inspectionTemplateService.ensureDefaultTemplate(actorId)).id;

    const { data, error } = await supabase
      .from("property_inspections")
      .insert({
        property_id: input.propertyId,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        template_id: templateId,
        customer_id: input.customerId || null,
        agent_id: input.agentId || null,
        inspector_id: input.inspectorId || null,
        inspection_type: input.inspectionType,
        scheduled_date: input.scheduledDate || null,
        status: input.inspectorId ? "ASSIGNED" : "SCHEDULED",
        notes: input.notes || null,
        created_by: actorId,
        updated_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("propertyInspectionService.create failed:", error);
      throw new Error("Could not create this inspection.");
    }

    const items = await inspectionTemplateService.listItems(templateId);
    if (items.length > 0) {
      await supabase.from("inspection_results").insert(
        items.map((it) => ({
          inspection_id: data.id,
          checklist_item_id: it.id,
          category: it.category,
          item: it.item,
          required: it.required,
        }))
      );
    }

    const inspection = mapRow(data);
    await maintenanceAuditService.log({ entityType: "inspection", entityId: inspection.id, action: "Created", actorId, newValue: { inspectionType: inspection.inspectionType, propertyId: inspection.propertyId } });
    return inspection;
  },

  async updateStatus(id: string, newStatus: InspectionStatus, actorId: string, actorName: string): Promise<PropertyInspection> {
    const inspection = await this.getById(id);
    if (!inspection) throw new Error("Inspection not found.");
    assertTransition(inspection.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus, updated_by: actorId };
    if (newStatus === "COMPLETED") extra.completed_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.from("property_inspections").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this inspection's status.");
    await maintenanceAuditService.log({ entityType: "inspection", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: inspection.status }, newValue: { status: newStatus } });
    return mapRow(data);
  },

  async updateDetails(id: string, input: { overallCondition?: ConditionRating; notes?: string; recommendations?: string }, actorId: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { updated_by: actorId };
    if (input.overallCondition !== undefined) row.overall_condition = input.overallCondition;
    if (input.notes !== undefined) row.notes = input.notes || null;
    if (input.recommendations !== undefined) row.recommendations = input.recommendations || null;
    const { error } = await supabase.from("property_inspections").update(row).eq("id", id);
    if (error) throw new Error("Could not update this inspection.");
  },

  // ---- Checklist results ----
  async listResults(inspectionId: string): Promise<InspectionResult[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_results").select("*").eq("inspection_id", inspectionId).order("category", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapResultRow);
  },

  async updateResult(resultId: string, input: InspectionResultInput): Promise<InspectionResult> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inspection_results")
      .update({ condition: input.condition, severity: input.severity || null, notes: input.notes || null })
      .eq("id", resultId)
      .select("*")
      .maybeSingle();
    if (error || !data) throw new Error("Could not update this checklist item.");
    return mapResultRow(data);
  },

  // ---- Photos (section 7) — private storage, signed-URL access only ----
  async listPhotos(inspectionId: string): Promise<InspectionPhoto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_photos").select("*, admin_profiles(name)").eq("inspection_id", inspectionId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapPhotoRow);
  },

  async uploadPhoto(
    input: { inspectionId: string; propertyId: string; dataUri: string; caption?: string; checklistResultId?: string; defectId?: string },
    actorId: string
  ): Promise<InspectionPhoto> {
    const parsed = parseUploadDataUri(input.dataUri);
    const path = buildStoragePath({ inspectionId: input.inspectionId }, randomUUID(), parsed.extension);
    await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inspection_photos")
      .insert({
        inspection_id: input.inspectionId,
        property_id: input.propertyId,
        checklist_result_id: input.checklistResultId || null,
        defect_id: input.defectId || null,
        storage_path: path,
        caption: input.caption || null,
        uploaded_by: actorId,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("propertyInspectionService.uploadPhoto failed:", error);
      throw new Error("Could not upload this photo.");
    }
    return mapPhotoRow(data);
  },

  async getPhotoSignedUrl(photoId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inspection_photos").select("storage_path").eq("id", photoId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this photo.");
    return createSignedDocumentUrl(data.storage_path);
  },

  async removePhoto(photoId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("inspection_photos").delete().eq("id", photoId);
    if (error) throw new Error("Could not delete this photo.");
  },

  async attachDocument(inspectionId: string, documentId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_inspections").update({ document_id: documentId }).eq("id", inspectionId);
    if (error) throw new Error("Could not link the generated report to this inspection.");
  },
};
