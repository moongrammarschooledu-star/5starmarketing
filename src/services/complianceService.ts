import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import { legalChecklistService } from "./legalChecklistService";
import type { PropertyComplianceRecord, PropertyComplianceRecordInput, ComplianceStatus } from "@/lib/models/legal";

const SELECT = "*, properties(title), projects(name), reviewer:admin_profiles!property_compliance_records_reviewed_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyComplianceRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    checklistTemplateId: row.checklist_template_id ?? undefined,
    status: row.status,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedByName: row.reviewer?.name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    nextReviewDate: row.next_review_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const complianceService = {
  async list(filters?: { propertyId?: string; status?: ComplianceStatus }): Promise<PropertyComplianceRecord[]> {
    const supabase = await createClient();
    let query = supabase.from("property_compliance_records").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("complianceService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<PropertyComplianceRecord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_compliance_records").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: PropertyComplianceRecordInput, actorId: string): Promise<PropertyComplianceRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_compliance_records")
      .insert({
        property_id: input.propertyId,
        project_id: input.projectId || null,
        checklist_template_id: input.checklistTemplateId || null,
        next_review_date: input.nextReviewDate || null,
        notes: input.notes || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("complianceService.create failed:", error);
      throw new Error("Could not create this compliance record.");
    }
    const record = mapRow(data);
    if (input.checklistTemplateId) {
      await legalChecklistService.initializeResults("COMPLIANCE_RECORD", record.id, input.checklistTemplateId);
    }
    await legalAuditService.log({ entityType: "property_compliance_record", entityId: record.id, action: "Created", actorId });
    return record;
  },

  /** Never a jurisdiction-specific claim without configured checklist
   *  data — the status here reflects only what has actually been
   *  reviewed against the assigned template. */
  async updateStatus(id: string, status: ComplianceStatus, actorId: string, actorName: string, notes?: string, nextReviewDate?: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { status, reviewed_by: actorId, reviewed_at: new Date().toISOString() };
    if (notes !== undefined) row.notes = notes || null;
    if (nextReviewDate !== undefined) row.next_review_date = nextReviewDate || null;
    const { error } = await supabase.from("property_compliance_records").update(row).eq("id", id);
    if (error) throw new Error("Could not update this compliance record's status.");
    await legalAuditService.log({ entityType: "property_compliance_record", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async listDueForReview(withinDays: number): Promise<PropertyComplianceRecord[]> {
    const supabase = await createClient();
    const until = new Date();
    until.setDate(until.getDate() + withinDays);
    const { data, error } = await supabase.from("property_compliance_records").select(SELECT).not("next_review_date", "is", null).lte("next_review_date", until.toISOString().slice(0, 10));
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
};
