import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentScenario, InvestmentScenarioInput } from "@/lib/models/investment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InvestmentScenario {
  return {
    id: row.id,
    name: row.name,
    annualAppreciationRate: Number(row.annual_appreciation_rate),
    isDefault: !!row.is_default,
    sortOrder: row.sort_order,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const investmentScenarioService = {
  async list(activeOnly = false): Promise<InvestmentScenario[]> {
    const supabase = await createClient();
    let query = supabase.from("investment_scenarios").select("*").order("sort_order", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(input: InvestmentScenarioInput): Promise<InvestmentScenario> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_scenarios")
      .insert({ name: input.name, annual_appreciation_rate: input.annualAppreciationRate, is_default: input.isDefault ?? false, sort_order: input.sortOrder ?? 100, active: input.active ?? true })
      .select("*")
      .single();
    if (error) {
      console.error("investmentScenarioService.create failed:", error);
      throw new Error("Could not create this scenario.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<InvestmentScenarioInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.annualAppreciationRate !== undefined) row.annual_appreciation_rate = input.annualAppreciationRate;
    if (input.isDefault !== undefined) row.is_default = input.isDefault;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("investment_scenarios").update(row).eq("id", id);
    if (error) throw new Error("Could not update this scenario.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("investment_scenarios").delete().eq("id", id);
    if (error) throw new Error("Could not delete this scenario.");
  },
};
