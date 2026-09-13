import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionSettings, ConstructionSettingsInput } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionSettings {
  return {
    budgetAlertThresholds: (row?.budget_alert_thresholds ?? [70, 80, 90, 100]).map(Number),
    defaultRetentionPercent: Number(row?.default_retention_percent ?? 0),
    currency: row?.currency ?? "PKR",
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const constructionSettingsService = {
  async get(): Promise<ConstructionSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("construction_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: ConstructionSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.budgetAlertThresholds !== undefined) row.budget_alert_thresholds = input.budgetAlertThresholds;
    if (input.defaultRetentionPercent !== undefined) row.default_retention_percent = input.defaultRetentionPercent;
    if (input.currency !== undefined) row.currency = input.currency;
    const { error } = await supabase.from("construction_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update construction settings.");
  },
};
