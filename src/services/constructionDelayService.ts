import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionDelay, ConstructionDelayInput } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionDelay {
  const durationDays = row.end_date ? Math.round((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / 86400000) : undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    taskId: row.task_id ?? undefined,
    taskTitle: row.construction_tasks?.title ?? undefined,
    reason: row.reason,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    durationDays,
    responsibility: row.responsibility ?? undefined,
    impact: row.impact ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const constructionDelayService = {
  async list(projectId: string): Promise<ConstructionDelay[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_delays").select("*, construction_phases(name), construction_tasks(title)").eq("project_id", projectId).order("start_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(projectId: string, input: ConstructionDelayInput, actorId: string): Promise<ConstructionDelay> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_delays")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        task_id: input.taskId || null,
        reason: input.reason,
        start_date: input.startDate,
        end_date: input.endDate || null,
        responsibility: input.responsibility || null,
        impact: input.impact || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*, construction_phases(name), construction_tasks(title)")
      .single();
    if (error) {
      console.error("constructionDelayService.create failed:", error);
      throw new Error("Could not record this delay.");
    }
    return mapRow(data);
  },

  async close(id: string, endDate: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_delays").update({ end_date: endDate }).eq("id", id);
    if (error) throw new Error("Could not close this delay.");
  },
};
