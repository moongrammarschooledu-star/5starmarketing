import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ValuationSettings, ValuationSettingsInput } from "@/lib/models/investment";
import { DEFAULT_INVESTMENT_DISCLAIMER } from "@/lib/models/investment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ValuationSettings {
  return {
    sqftPerSqyd: Number(row?.sqft_per_sqyd ?? 9.0),
    sqftPerMarla: Number(row?.sqft_per_marla ?? 272.25),
    sqftPerKanal: Number(row?.sqft_per_kanal ?? 5445.0),
    sqftPerAcre: Number(row?.sqft_per_acre ?? 43560.0),
    minComparablesForHigh: row?.min_comparables_for_high ?? 3,
    minComparablesForMedium: row?.min_comparables_for_medium ?? 1,
    maxMarketDataAgeMonthsForHigh: row?.max_market_data_age_months_for_high ?? 6,
    defaultVacancyRate: Number(row?.default_vacancy_rate ?? 5.0),
    defaultMaintenanceRate: Number(row?.default_maintenance_rate ?? 5.0),
    defaultManagementFeeRate: Number(row?.default_management_fee_rate ?? 8.0),
    defaultInvestmentHorizonYears: row?.default_investment_horizon_years ?? 5,
    currency: row?.currency ?? "PKR",
    disclaimerText: row?.disclaimer_text ?? DEFAULT_INVESTMENT_DISCLAIMER,
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export const valuationSettingsService = {
  async get(): Promise<ValuationSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("valuation_settings").select("*").eq("id", 1).maybeSingle();
    return mapRow(data);
  },

  async update(input: ValuationSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.sqftPerSqyd !== undefined) row.sqft_per_sqyd = input.sqftPerSqyd;
    if (input.sqftPerMarla !== undefined) row.sqft_per_marla = input.sqftPerMarla;
    if (input.sqftPerKanal !== undefined) row.sqft_per_kanal = input.sqftPerKanal;
    if (input.sqftPerAcre !== undefined) row.sqft_per_acre = input.sqftPerAcre;
    if (input.minComparablesForHigh !== undefined) row.min_comparables_for_high = input.minComparablesForHigh;
    if (input.minComparablesForMedium !== undefined) row.min_comparables_for_medium = input.minComparablesForMedium;
    if (input.maxMarketDataAgeMonthsForHigh !== undefined) row.max_market_data_age_months_for_high = input.maxMarketDataAgeMonthsForHigh;
    if (input.defaultVacancyRate !== undefined) row.default_vacancy_rate = input.defaultVacancyRate;
    if (input.defaultMaintenanceRate !== undefined) row.default_maintenance_rate = input.defaultMaintenanceRate;
    if (input.defaultManagementFeeRate !== undefined) row.default_management_fee_rate = input.defaultManagementFeeRate;
    if (input.defaultInvestmentHorizonYears !== undefined) row.default_investment_horizon_years = input.defaultInvestmentHorizonYears;
    if (input.currency !== undefined) row.currency = input.currency;
    if (input.disclaimerText !== undefined) row.disclaimer_text = input.disclaimerText;
    const { error } = await supabase.from("valuation_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update valuation settings.");
  },
};
