import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import type { ConstructionPhase, ConstructionPhaseInput, PhaseStatus, ConstructionMilestone, ConstructionMilestoneInput, MilestoneStatus } from "@/lib/models/construction";

const PHASE_SELECT = "*, admin_profiles(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPhaseRow(row: any): ConstructionPhase {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sequence: row.sequence,
    plannedStart: row.planned_start ?? undefined,
    plannedFinish: row.planned_finish ?? undefined,
    actualStart: row.actual_start ?? undefined,
    actualFinish: row.actual_finish ?? undefined,
    weight: Number(row.weight),
    progress: Number(row.progress),
    status: row.status,
    responsiblePersonId: row.responsible_person_id ?? undefined,
    responsiblePersonName: row.admin_profiles?.name ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMilestoneRow(row: any): ConstructionMilestone {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    name: row.name,
    plannedDate: row.planned_date ?? undefined,
    actualDate: row.actual_date ?? undefined,
    status: row.status,
    weight: Number(row.weight),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const constructionPhaseService = {
  async list(projectId: string): Promise<ConstructionPhase[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_phases").select(PHASE_SELECT).eq("project_id", projectId).order("sequence", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapPhaseRow);
  },

  async getById(id: string): Promise<ConstructionPhase | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_phases").select(PHASE_SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapPhaseRow(data);
  },

  async create(projectId: string, input: ConstructionPhaseInput, actorId: string, actorName: string): Promise<ConstructionPhase> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_phases")
      .insert({
        project_id: projectId,
        name: input.name,
        sequence: input.sequence ?? 1,
        planned_start: input.plannedStart || null,
        planned_finish: input.plannedFinish || null,
        weight: input.weight ?? 0,
        responsible_person_id: input.responsiblePersonId || null,
        notes: input.notes || null,
      })
      .select(PHASE_SELECT)
      .single();
    if (error) {
      console.error("constructionPhaseService.create failed:", error);
      throw new Error("Could not create this phase.");
    }
    const phase = mapPhaseRow(data);
    await constructionAuditService.log({ entityType: "phase", entityId: phase.id, action: "Created", actorId, actorName, newValue: { name: phase.name } });
    return phase;
  },

  async update(id: string, input: Partial<ConstructionPhaseInput> & { progress?: number; status?: PhaseStatus; actualStart?: string; actualFinish?: string }, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.sequence !== undefined) row.sequence = input.sequence;
    if (input.plannedStart !== undefined) row.planned_start = input.plannedStart || null;
    if (input.plannedFinish !== undefined) row.planned_finish = input.plannedFinish || null;
    if (input.actualStart !== undefined) row.actual_start = input.actualStart || null;
    if (input.actualFinish !== undefined) row.actual_finish = input.actualFinish || null;
    if (input.weight !== undefined) row.weight = input.weight;
    if (input.progress !== undefined) row.progress = Math.max(0, Math.min(100, input.progress));
    if (input.status !== undefined) row.status = input.status;
    if (input.responsiblePersonId !== undefined) row.responsible_person_id = input.responsiblePersonId || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("construction_phases").update(row).eq("id", id);
    if (error) throw new Error("Could not update this phase.");
    await constructionAuditService.log({ entityType: "phase", entityId: id, action: "Updated", actorId, actorName, newValue: input });
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_phases").delete().eq("id", id);
    if (error) throw new Error("Could not delete this phase.");
  },

  // ---- Milestones (section 8) ----
  async listMilestones(projectId: string): Promise<ConstructionMilestone[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_milestones").select("*, construction_phases(name)").eq("project_id", projectId).order("planned_date", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapMilestoneRow);
  },

  async createMilestone(projectId: string, input: ConstructionMilestoneInput, actorId: string, actorName: string): Promise<ConstructionMilestone> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_milestones")
      .insert({ project_id: projectId, phase_id: input.phaseId || null, name: input.name, planned_date: input.plannedDate || null, weight: input.weight ?? 0, notes: input.notes || null })
      .select("*, construction_phases(name)")
      .single();
    if (error) {
      console.error("constructionPhaseService.createMilestone failed:", error);
      throw new Error("Could not create this milestone.");
    }
    const milestone = mapMilestoneRow(data);
    await constructionAuditService.log({ entityType: "milestone", entityId: milestone.id, action: "Created", actorId, actorName, newValue: { name: milestone.name } });
    return milestone;
  },

  async updateMilestoneStatus(id: string, status: MilestoneStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const extra: Record<string, unknown> = { status };
    if (status === "COMPLETED") extra.actual_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("construction_milestones").update(extra).eq("id", id);
    if (error) throw new Error("Could not update this milestone.");
    await constructionAuditService.log({ entityType: "milestone", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async removeMilestone(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_milestones").delete().eq("id", id);
    if (error) throw new Error("Could not delete this milestone.");
  },
};
