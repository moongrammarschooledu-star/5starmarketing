import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LegalSettings, LegalSettingsInput } from "@/lib/models/legal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalSettings {
  return {
    documentExpiryReminderDaysBefore: (row?.document_expiry_reminder_days_before ?? [30, 7, 1]).map(Number),
    dueDiligenceDeadlineReminderDays: (row?.due_diligence_deadline_reminder_days ?? [7, 3, 1]).map(Number),
    complianceReviewReminderDays: (row?.compliance_review_reminder_days ?? [30, 7]).map(Number),
    requireLegalClearanceForDealCompletion: !!row?.require_legal_clearance_for_deal_completion,
    defaultConfidentialityLevel: row?.default_confidentiality_level ?? "INTERNAL",
    currency: row?.currency ?? "PKR",
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const legalSettingsService = {
  async get(): Promise<LegalSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("legal_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: LegalSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.documentExpiryReminderDaysBefore !== undefined) row.document_expiry_reminder_days_before = input.documentExpiryReminderDaysBefore;
    if (input.dueDiligenceDeadlineReminderDays !== undefined) row.due_diligence_deadline_reminder_days = input.dueDiligenceDeadlineReminderDays;
    if (input.complianceReviewReminderDays !== undefined) row.compliance_review_reminder_days = input.complianceReviewReminderDays;
    if (input.requireLegalClearanceForDealCompletion !== undefined) row.require_legal_clearance_for_deal_completion = input.requireLegalClearanceForDealCompletion;
    if (input.defaultConfidentialityLevel !== undefined) row.default_confidentiality_level = input.defaultConfidentialityLevel;
    if (input.currency !== undefined) row.currency = input.currency;
    const { error } = await supabase.from("legal_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update legal settings.");
  },
};
