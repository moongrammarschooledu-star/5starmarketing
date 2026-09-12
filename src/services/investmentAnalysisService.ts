import "server-only";
import { createClient } from "@/lib/supabase/server";
import { investmentAuditService } from "./investmentAuditService";
import { computeInvestmentResults } from "@/lib/investment/computeAnalysis";
import type { InvestmentAnalysis, InvestmentAnalysisInput, InvestmentInputs, InvestmentResults, InvestmentCashFlowYear } from "@/lib/models/investment";

export { computeInvestmentResults };

const SELECT = "*, properties(title), projects(name), admin_profiles(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any, cashFlows?: InvestmentCashFlowYear[]): InvestmentAnalysis {
  return {
    id: row.id,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    customerId: row.customer_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    name: row.name,
    scenarioName: row.scenario_name ?? undefined,
    inputs: row.inputs as InvestmentInputs,
    results: row.results as InvestmentResults,
    cashFlows,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const investmentAnalysisService = {
  async getById(id: string): Promise<InvestmentAnalysis | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_analyses").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const { data: flows } = await supabase.from("investment_cash_flows").select("*").eq("investment_analysis_id", id).order("year_number", { ascending: true });
    const cashFlows: InvestmentCashFlowYear[] = (flows ?? []).map((f) => ({
      yearNumber: f.year_number,
      grossRentalIncome: Number(f.gross_rental_income),
      expenses: Number(f.expenses),
      netCashFlow: Number(f.net_cash_flow),
      cumulativeCashFlow: Number(f.cumulative_cash_flow),
      projectedPropertyValue: Number(f.projected_property_value),
    }));
    return mapRow(data, cashFlows);
  },

  async listForCustomer(customerId: string): Promise<InvestmentAnalysis[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_analyses").select(SELECT).eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapRow(row));
  },

  async listForProperty(propertyId: string): Promise<InvestmentAnalysis[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_analyses").select(SELECT).eq("property_id", propertyId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => mapRow(row));
  },

  async create(input: InvestmentAnalysisInput, owner: { customerId?: string; adminId?: string }, actorName?: string): Promise<InvestmentAnalysis> {
    if (input.inputs.purchasePrice <= 0) throw new Error("Please enter a valid purchase price.");
    if (input.inputs.investmentHorizonYears <= 0) throw new Error("Please enter a valid investment horizon.");

    const { results, cashFlows } = computeInvestmentResults(input.inputs);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_analyses")
      .insert({
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        customer_id: owner.customerId || null,
        created_by: owner.adminId || null,
        name: input.name,
        scenario_name: input.scenarioName || null,
        inputs: input.inputs,
        results,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("investmentAnalysisService.create failed:", error);
      throw new Error("Could not save this analysis.");
    }

    if (cashFlows.length > 0) {
      await supabase.from("investment_cash_flows").insert(
        cashFlows.map((y) => ({
          investment_analysis_id: data.id,
          year_number: y.yearNumber,
          gross_rental_income: y.grossRentalIncome,
          expenses: y.expenses,
          net_cash_flow: y.netCashFlow,
          cumulative_cash_flow: y.cumulativeCashFlow,
          projected_property_value: y.projectedPropertyValue,
        }))
      );
    }

    const analysis = mapRow(data, cashFlows);
    await investmentAuditService.log({ entityType: "investment_analysis", entityId: analysis.id, action: "Created", actorId: owner.adminId, actorName, newValue: { name: analysis.name } });
    return analysis;
  },

  async rename(id: string, name: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("investment_analyses").update({ name }).eq("id", id);
    if (error) throw new Error("Could not rename this analysis.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("investment_analyses").delete().eq("id", id);
    if (error) throw new Error("Could not delete this analysis.");
  },

  async duplicate(id: string, newName: string, owner: { customerId?: string; adminId?: string }): Promise<InvestmentAnalysis> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Analysis not found.");
    return this.create({ propertyId: existing.propertyId, projectId: existing.projectId, name: newName, scenarioName: existing.scenarioName, inputs: existing.inputs }, owner);
  },
};
