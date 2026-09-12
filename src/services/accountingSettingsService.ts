import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AccountingSettings, AccountingSettingsInput } from "@/lib/models/accounting";

export const accountingSettingsService = {
  async get(): Promise<AccountingSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("accounting_settings").select("*").eq("id", 1).maybeSingle();
    return {
      defaultCommissionBasis: data?.default_commission_basis ?? "DEAL_AMOUNT",
      fiscalYearStartMonth: data?.fiscal_year_start_month ?? 1,
      currency: data?.currency ?? "PKR",
      updatedAt: data?.updated_at ?? new Date().toISOString(),
    };
  },

  async update(input: AccountingSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.defaultCommissionBasis !== undefined) row.default_commission_basis = input.defaultCommissionBasis;
    if (input.fiscalYearStartMonth !== undefined) row.fiscal_year_start_month = input.fiscalYearStartMonth;
    if (input.currency !== undefined) row.currency = input.currency;
    const { error } = await supabase.from("accounting_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update accounting settings.");
  },
};
