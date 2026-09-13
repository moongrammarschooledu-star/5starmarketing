import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SNAG_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionSnag, ConstructionSnagInput, SnagStatus } from "@/lib/models/construction";

const SELECT = "*, property_inventory(unit_number), construction_contractors(maintenance_vendors(business_name))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionSnag {
  return {
    id: row.id,
    snagNumber: row.snag_number,
    projectId: row.project_id,
    unitId: row.unit_id ?? undefined,
    unitNumber: row.property_inventory?.unit_number ?? undefined,
    category: row.category,
    description: row.description,
    location: row.location ?? undefined,
    severity: row.severity,
    assignedContractorId: row.assigned_contractor_id ?? undefined,
    assignedContractorName: row.construction_contractors?.maintenance_vendors?.business_name ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: SnagStatus, to: SnagStatus) {
  if (!SNAG_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a snag from ${from} to ${to}.`);
  }
}

export const constructionSnagService = {
  async list(projectId: string): Promise<ConstructionSnag[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_snags").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<ConstructionSnag | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_snags").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(projectId: string, input: ConstructionSnagInput, actorId: string): Promise<ConstructionSnag> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_snags")
      .insert({
        project_id: projectId,
        unit_id: input.unitId || null,
        category: input.category,
        description: input.description,
        location: input.location || null,
        severity: input.severity ?? "MEDIUM",
        assigned_contractor_id: input.assignedContractorId || null,
        due_date: input.dueDate || null,
        status: input.assignedContractorId ? "ASSIGNED" : "OPEN",
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionSnagService.create failed:", error);
      throw new Error("Could not create this snag.");
    }
    return mapRow(data);
  },

  async updateStatus(id: string, status: SnagStatus): Promise<ConstructionSnag> {
    const snag = await this.getById(id);
    if (!snag) throw new Error("Snag not found.");
    assertTransition(snag.status, status);
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_snags").update({ status }).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this snag's status.");
    return mapRow(data);
  },
};
