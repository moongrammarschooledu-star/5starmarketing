import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionPhaseService } from "./constructionPhaseService";
import { constructionProjectService } from "./constructionProjectService";
import type { ConstructionProgressUpdate, ProgressUpdateType, ProjectProgressSummary } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionProgressUpdate {
  return {
    id: row.id,
    projectId: row.project_id,
    updateType: row.update_type,
    referenceId: row.reference_id ?? undefined,
    plannedPercent: row.planned_percent != null ? Number(row.planned_percent) : undefined,
    actualPercent: row.actual_percent != null ? Number(row.actual_percent) : undefined,
    notes: row.notes ?? undefined,
    customerVisible: !!row.customer_visible,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const constructionProgressService = {
  async listUpdates(projectId: string, customerVisibleOnly = false): Promise<ConstructionProgressUpdate[]> {
    const supabase = await createClient();
    let query = supabase.from("construction_progress_updates").select("*, admin_profiles(name)").eq("project_id", projectId).order("created_at", { ascending: false });
    if (customerVisibleOnly) query = query.eq("customer_visible", true);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async recordUpdate(
    projectId: string,
    input: { updateType: ProgressUpdateType; referenceId?: string; plannedPercent?: number; actualPercent?: number; notes?: string; customerVisible?: boolean },
    actorId: string
  ): Promise<ConstructionProgressUpdate> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_progress_updates")
      .insert({
        project_id: projectId,
        update_type: input.updateType,
        reference_id: input.referenceId || null,
        planned_percent: input.plannedPercent ?? null,
        actual_percent: input.actualPercent ?? null,
        notes: input.notes || null,
        customer_visible: input.customerVisible ?? false,
        created_by: actorId,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionProgressService.recordUpdate failed:", error);
      throw new Error("Could not record this progress update.");
    }
    return mapRow(data);
  },

  /** Section 7 — weighted phase progress where weights are configured
   *  (never a naive average when real weights exist); "planned %" is a
   *  simple linear time-elapsed estimate over the project's own start/
   *  planned-completion dates — disclosed as a simplification, never
   *  presented as a detailed schedule-network (S-curve) calculation.
   *  Returns null planned/variance when there isn't enough real data to
   *  compute them (never fabricated). */
  async overallProgress(projectId: string): Promise<ProjectProgressSummary> {
    const [project, phases] = await Promise.all([constructionProjectService.getById(projectId), constructionPhaseService.list(projectId)]);

    let actualPercent = 0;
    let usedWeighting = false;
    if (phases.length > 0) {
      const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
      if (totalWeight > 0) {
        actualPercent = phases.reduce((sum, p) => sum + (p.weight / totalWeight) * p.progress, 0);
        usedWeighting = true;
      } else {
        actualPercent = phases.reduce((sum, p) => sum + p.progress, 0) / phases.length;
      }
    }
    actualPercent = Math.round(actualPercent * 100) / 100;

    let plannedPercent: number | null = null;
    if (project?.startDate && project?.plannedCompletionDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.plannedCompletionDate).getTime();
      const now = Date.now();
      if (end > start) {
        plannedPercent = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 10000) / 100));
      }
    }

    const variancePercent = plannedPercent != null ? Math.round((actualPercent - plannedPercent) * 100) / 100 : null;
    return { plannedPercent, actualPercent, variancePercent, usedWeighting };
  },
};
