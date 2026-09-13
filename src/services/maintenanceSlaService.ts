import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceSlaSetting, MaintenanceSlaSettingInput, MaintenancePriority } from "@/lib/models/maintenance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceSlaSetting {
  return {
    priority: row.priority,
    responseMinutes: row.response_minutes,
    resolutionMinutes: row.resolution_minutes,
    active: !!row.active,
    updatedAt: row.updated_at,
  };
}

export const maintenanceSlaService = {
  async list(): Promise<MaintenanceSlaSetting[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_sla_settings").select("*");
    if (error) return [];
    const order: MaintenancePriority[] = ["EMERGENCY", "URGENT", "HIGH", "NORMAL", "LOW"];
    return (data ?? []).map(mapRow).sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
  },

  async getFor(priority: MaintenancePriority): Promise<MaintenanceSlaSetting | undefined> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_sla_settings").select("*").eq("priority", priority).maybeSingle();
    return data ? mapRow(data) : undefined;
  },

  async update(priority: MaintenancePriority, input: MaintenanceSlaSettingInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("maintenance_sla_settings")
      .update({ response_minutes: input.responseMinutes, resolution_minutes: input.resolutionMinutes, active: input.active })
      .eq("priority", priority);
    if (error) throw new Error("Could not update this SLA setting.");
  },
};
