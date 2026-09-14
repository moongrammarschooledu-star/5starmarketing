import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RentalSettings, RentalSettingsInput } from "@/lib/models/rental";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentalSettings {
  return {
    defaultGracePeriodDays: Number(row?.default_grace_period_days ?? 5),
    defaultLateFeeType: row?.default_late_fee_type ?? "NONE",
    defaultLateFeeValue: Number(row?.default_late_fee_value ?? 0),
    leaseExpiryReminderDays: (row?.lease_expiry_reminder_days ?? [60, 30, 7]).map(Number),
    rentDueReminderDaysBefore: Number(row?.rent_due_reminder_days_before ?? 3),
    currency: row?.currency ?? "PKR",
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const rentalSettingsService = {
  async get(): Promise<RentalSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("rental_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: RentalSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.defaultGracePeriodDays !== undefined) row.default_grace_period_days = input.defaultGracePeriodDays;
    if (input.defaultLateFeeType !== undefined) row.default_late_fee_type = input.defaultLateFeeType;
    if (input.defaultLateFeeValue !== undefined) row.default_late_fee_value = input.defaultLateFeeValue;
    if (input.leaseExpiryReminderDays !== undefined) row.lease_expiry_reminder_days = input.leaseExpiryReminderDays;
    if (input.rentDueReminderDaysBefore !== undefined) row.rent_due_reminder_days_before = input.rentDueReminderDaysBefore;
    if (input.currency !== undefined) row.currency = input.currency;
    const { error } = await supabase.from("rental_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update rental settings.");
  },
};
