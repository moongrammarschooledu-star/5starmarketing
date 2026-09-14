import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupportSettings, SupportSettingsInput } from "@/lib/models/support";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportSettings {
  return {
    businessHoursStart: row?.business_hours_start ?? "09:00",
    businessHoursEnd: row?.business_hours_end ?? "18:00",
    businessDays: (row?.business_days ?? [1, 2, 3, 4, 5]).map(Number),
    defaultDepartmentId: row?.default_department_id ?? undefined,
    disclaimerText:
      row?.disclaimer_text ??
      "This support system is provided for service requests, communication and record management. Legal, financial or regulatory matters may require review by an appropriately qualified professional.",
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const supportSettingsService = {
  async get(): Promise<SupportSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: SupportSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.businessHoursStart !== undefined) row.business_hours_start = input.businessHoursStart;
    if (input.businessHoursEnd !== undefined) row.business_hours_end = input.businessHoursEnd;
    if (input.businessDays !== undefined) row.business_days = input.businessDays;
    if (input.defaultDepartmentId !== undefined) row.default_department_id = input.defaultDepartmentId || null;
    if (input.disclaimerText !== undefined) row.disclaimer_text = input.disclaimerText;
    const { error } = await supabase.from("support_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update support settings.");
  },
};
