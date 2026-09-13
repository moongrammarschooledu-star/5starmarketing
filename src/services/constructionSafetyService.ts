import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionSafetyRecord, ConstructionSafetyRecordInput, SafetyStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionSafetyRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    recordType: row.record_type,
    description: row.description,
    reportedByName: row.reported?.name ?? undefined,
    recordDate: row.record_date,
    correctiveAction: row.corrective_action ?? undefined,
    responsiblePersonId: row.responsible_person_id ?? undefined,
    responsiblePersonName: row.responsible?.name ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = "*, reported:admin_profiles!construction_safety_records_reported_by_fkey(name), responsible:admin_profiles!construction_safety_records_responsible_person_id_fkey(name)";

export const constructionSafetyService = {
  async list(projectId: string): Promise<ConstructionSafetyRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_safety_records").select(SELECT).eq("project_id", projectId).order("record_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(projectId: string, input: ConstructionSafetyRecordInput, actorId: string): Promise<ConstructionSafetyRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_safety_records")
      .insert({
        project_id: projectId,
        record_type: input.recordType,
        description: input.description,
        reported_by: actorId,
        record_date: input.recordDate || new Date().toISOString().slice(0, 10),
        corrective_action: input.correctiveAction || null,
        responsible_person_id: input.responsiblePersonId || null,
        due_date: input.dueDate || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionSafetyService.create failed:", error);
      throw new Error("Could not create this safety record.");
    }
    return mapRow(data);
  },

  async updateStatus(id: string, status: SafetyStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_safety_records").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this safety record's status.");
  },
};
