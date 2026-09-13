import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionLaborRecord, ConstructionLaborRecordInput } from "@/lib/models/construction";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionLaborRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    workerOrTeam: row.worker_or_team,
    trade: row.trade,
    recordDate: row.record_date,
    hours: Number(row.hours),
    dailyRate: row.daily_rate != null ? Number(row.daily_rate) : undefined,
    overtimeHours: Number(row.overtime_hours),
    overtimeRate: row.overtime_rate != null ? Number(row.overtime_rate) : undefined,
    totalLaborCost: Number(row.total_labor_cost),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export const constructionLaborService = {
  async list(projectId: string): Promise<ConstructionLaborRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_labor_records").select("*, construction_phases(name)").eq("project_id", projectId).order("record_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** total_labor_cost = (hours/8 × daily_rate) + (overtime_hours ×
   *  overtime_rate) when rates are configured — otherwise 0, never
   *  invented (section 21: no payroll assumptions beyond what's given). */
  async create(projectId: string, input: ConstructionLaborRecordInput, actorId: string): Promise<ConstructionLaborRecord> {
    const regularCost = input.dailyRate ? (input.hours / 8) * input.dailyRate : 0;
    const overtimeCost = input.overtimeRate && input.overtimeHours ? input.overtimeHours * input.overtimeRate : 0;
    const totalLaborCost = round2(regularCost + overtimeCost);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_labor_records")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        worker_or_team: input.workerOrTeam,
        trade: input.trade,
        record_date: input.recordDate || new Date().toISOString().slice(0, 10),
        hours: input.hours,
        daily_rate: input.dailyRate ?? null,
        overtime_hours: input.overtimeHours ?? 0,
        overtime_rate: input.overtimeRate ?? null,
        total_labor_cost: totalLaborCost,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*, construction_phases(name)")
      .single();
    if (error) {
      console.error("constructionLaborService.create failed:", error);
      throw new Error("Could not record this labor entry.");
    }
    return mapRow(data);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_labor_records").delete().eq("id", id);
    if (error) throw new Error("Could not delete this labor record.");
  },
};
