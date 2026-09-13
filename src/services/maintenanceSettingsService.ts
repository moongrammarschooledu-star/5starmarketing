import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceSettings, MaintenanceSettingsInput } from "@/lib/models/maintenance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceSettings {
  return {
    recurringIssueThresholdCount: row?.recurring_issue_threshold_count ?? 3,
    recurringIssueWindowDays: row?.recurring_issue_window_days ?? 90,
    warrantyAlertDaysBefore: row?.warranty_alert_days_before ?? 30,
    preventiveMaintenanceAlertDaysBefore: row?.preventive_maintenance_alert_days_before ?? 14,
    conditionScoreExcellentMin: Number(row?.condition_score_excellent_min ?? 90),
    conditionScoreGoodMin: Number(row?.condition_score_good_min ?? 75),
    conditionScoreFairMin: Number(row?.condition_score_fair_min ?? 50),
    conditionScoreNeedsAttentionMin: Number(row?.condition_score_needs_attention_min ?? 25),
    currency: row?.currency ?? "PKR",
    disclaimerText:
      row?.disclaimer_text ??
      "This inspection report reflects the condition observed on the inspection date only. It is not a warranty, guarantee, or certification of a property's future condition.",
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const maintenanceSettingsService = {
  async get(): Promise<MaintenanceSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("maintenance_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: MaintenanceSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.recurringIssueThresholdCount !== undefined) row.recurring_issue_threshold_count = input.recurringIssueThresholdCount;
    if (input.recurringIssueWindowDays !== undefined) row.recurring_issue_window_days = input.recurringIssueWindowDays;
    if (input.warrantyAlertDaysBefore !== undefined) row.warranty_alert_days_before = input.warrantyAlertDaysBefore;
    if (input.preventiveMaintenanceAlertDaysBefore !== undefined) row.preventive_maintenance_alert_days_before = input.preventiveMaintenanceAlertDaysBefore;
    if (input.conditionScoreExcellentMin !== undefined) row.condition_score_excellent_min = input.conditionScoreExcellentMin;
    if (input.conditionScoreGoodMin !== undefined) row.condition_score_good_min = input.conditionScoreGoodMin;
    if (input.conditionScoreFairMin !== undefined) row.condition_score_fair_min = input.conditionScoreFairMin;
    if (input.conditionScoreNeedsAttentionMin !== undefined) row.condition_score_needs_attention_min = input.conditionScoreNeedsAttentionMin;
    if (input.currency !== undefined) row.currency = input.currency;
    if (input.disclaimerText !== undefined) row.disclaimer_text = input.disclaimerText;
    const { error } = await supabase.from("maintenance_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update maintenance settings.");
  },
};
