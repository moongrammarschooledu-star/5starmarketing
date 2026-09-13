import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionEquipment, ConstructionEquipmentInput, EquipmentMaintenanceStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionEquipment {
  return {
    id: row.id,
    projectId: row.project_id,
    equipmentName: row.equipment_name,
    category: row.category,
    ownerOrVendor: row.owner_or_vendor ?? undefined,
    assetId: row.asset_id ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    usageHours: row.usage_hours != null ? Number(row.usage_hours) : undefined,
    rentalRate: row.rental_rate != null ? Number(row.rental_rate) : undefined,
    maintenanceStatus: row.maintenance_status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const constructionEquipmentService = {
  async list(projectId: string): Promise<ConstructionEquipment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_equipment").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(projectId: string, input: ConstructionEquipmentInput, actorId: string): Promise<ConstructionEquipment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_equipment")
      .insert({
        project_id: projectId,
        equipment_name: input.equipmentName,
        category: input.category,
        owner_or_vendor: input.ownerOrVendor || null,
        asset_id: input.assetId || null,
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        usage_hours: input.usageHours ?? null,
        rental_rate: input.rentalRate ?? null,
        maintenance_status: input.maintenanceStatus ?? "OPERATIONAL",
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("constructionEquipmentService.create failed:", error);
      throw new Error("Could not add this equipment.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<ConstructionEquipmentInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.usageHours !== undefined) row.usage_hours = input.usageHours;
    if (input.maintenanceStatus !== undefined) row.maintenance_status = input.maintenanceStatus;
    if (input.endDate !== undefined) row.end_date = input.endDate || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("construction_equipment").update(row).eq("id", id);
    if (error) throw new Error("Could not update this equipment record.");
  },

  async setMaintenanceStatus(id: string, status: EquipmentMaintenanceStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_equipment").update({ maintenance_status: status }).eq("id", id);
    if (error) throw new Error("Could not update this equipment's maintenance status.");
  },
};
