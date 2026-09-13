import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import type { ConstructionQualityInspection, ConstructionQualityInspectionInput, ConstructionQualityIssue, ConstructionQualityIssueInput, QualityIssueStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInspectionRow(row: any): ConstructionQualityInspection {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    category: row.category,
    inspectorName: row.admin_profiles?.name ?? undefined,
    inspectionDate: row.inspection_date,
    result: row.result,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIssueRow(row: any): ConstructionQualityIssue {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    description: row.description,
    correctiveAction: row.corrective_action ?? undefined,
    responsibleParty: row.responsible_party ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    verifiedByName: row.verified?.name ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const constructionQualityService = {
  async list(projectId: string): Promise<ConstructionQualityInspection[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_quality_inspections").select("*, construction_phases(name), admin_profiles(name)").eq("project_id", projectId).order("inspection_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapInspectionRow);
  },

  async create(projectId: string, input: ConstructionQualityInspectionInput, actorId: string): Promise<ConstructionQualityInspection> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_quality_inspections")
      .insert({ project_id: projectId, phase_id: input.phaseId || null, category: input.category, inspector_id: actorId, inspection_date: input.inspectionDate || new Date().toISOString().slice(0, 10), result: input.result ?? "REQUIRES_REVIEW", notes: input.notes || null, created_by: actorId })
      .select("*, construction_phases(name), admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionQualityService.create failed:", error);
      throw new Error("Could not create this inspection.");
    }
    const inspection = mapInspectionRow(data);
    await constructionAuditService.log({ entityType: "quality_inspection", entityId: inspection.id, action: "Created", actorId, newValue: { category: inspection.category, result: inspection.result } });
    return inspection;
  },

  async setResult(id: string, result: ConstructionQualityInspection["result"], actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_quality_inspections").update({ result }).eq("id", id);
    if (error) throw new Error("Could not update this inspection's result.");
    await constructionAuditService.log({ entityType: "quality_inspection", entityId: id, action: `Result changed to ${result}`, actorId, actorName });
  },

  // ---- Issues ----
  async listIssues(inspectionId: string): Promise<ConstructionQualityIssue[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_quality_issues").select("*, verified:admin_profiles!construction_quality_issues_verified_by_fkey(name)").eq("inspection_id", inspectionId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapIssueRow);
  },

  async createIssue(inspectionId: string, input: ConstructionQualityIssueInput): Promise<ConstructionQualityIssue> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_quality_issues")
      .insert({ inspection_id: inspectionId, description: input.description, corrective_action: input.correctiveAction || null, responsible_party: input.responsibleParty || null, due_date: input.dueDate || null })
      .select("*, verified:admin_profiles!construction_quality_issues_verified_by_fkey(name)")
      .single();
    if (error) {
      console.error("constructionQualityService.createIssue failed:", error);
      throw new Error("Could not create this quality issue.");
    }
    return mapIssueRow(data);
  },

  async updateIssueStatus(id: string, status: QualityIssueStatus, actorId: string): Promise<void> {
    const supabase = await createClient();
    const extra: Record<string, unknown> = { status };
    if (status === "VERIFIED") {
      extra.verified_by = actorId;
      extra.verified_at = new Date().toISOString();
    }
    const { error } = await supabase.from("construction_quality_issues").update(extra).eq("id", id);
    if (error) throw new Error("Could not update this issue's status.");
  },
};
