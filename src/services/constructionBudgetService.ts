import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ConstructionBudgetLine, ConstructionBudgetLineInput, BudgetCategory, BudgetLineSummary } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionBudgetLine {
  return { id: row.id, projectId: row.project_id, category: row.category, budgetedAmount: Number(row.budgeted_amount), notes: row.notes ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

export const constructionBudgetService = {
  async listLines(projectId: string): Promise<ConstructionBudgetLine[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_budgets").select("*").eq("project_id", projectId).order("category", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async upsertLine(projectId: string, input: ConstructionBudgetLineInput, actorId: string): Promise<ConstructionBudgetLine> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_budgets")
      .upsert({ project_id: projectId, category: input.category, budgeted_amount: input.budgetedAmount, notes: input.notes || null, created_by: actorId }, { onConflict: "project_id,category" })
      .select("*")
      .single();
    if (error) {
      console.error("constructionBudgetService.upsertLine failed:", error);
      throw new Error("Could not save this budget line.");
    }
    return mapRow(data);
  },

  /** Section 23 — committed/actual/remaining/variance are ALWAYS
   *  derived live from real construction_expenses/purchase_orders/work
   *  orders, never stored on the budget row itself (so nothing can
   *  drift, and historical actuals are never touched to "fix" a
   *  number). "Committed" = approved-but-not-yet-paid PO totals and
   *  work-order contract amounts; "actual" = paid/approved expenses. */
  async summary(projectId: string): Promise<BudgetLineSummary[]> {
    const supabase = await createClient();
    const [{ data: lines }, { data: expenses }, { data: pos }, { data: workOrders }] = await Promise.all([
      supabase.from("construction_budgets").select("*").eq("project_id", projectId),
      supabase.from("construction_expenses").select("category, amount, status").eq("project_id", projectId),
      supabase.from("construction_purchase_orders").select("total_amount, status").eq("project_id", projectId).in("status", ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"]),
      supabase.from("construction_work_orders").select("contract_amount, status").eq("project_id", projectId).not("status", "in", "(CANCELLED)"),
    ]);

    const committedFromPOs = (pos ?? []).reduce((sum, p) => sum + Number(p.total_amount), 0);
    const committedFromWorkOrders = (workOrders ?? []).filter((w) => w.status !== "COMPLETED" && w.status !== "VERIFIED").reduce((sum, w) => sum + Number(w.contract_amount ?? 0), 0);
    // Materials committed cost lives on POs; Contractors committed cost on
    // work orders — everything else has no committed-cost source yet, so
    // it is simply 0 (never invented).
    const committedByCategory: Record<BudgetCategory, number> = { Materials: committedFromPOs, Labor: 0, Contractors: committedFromWorkOrders, Equipment: 0, Transportation: 0, Permits: 0, Consultants: 0, Utilities: 0, Other: 0 };

    const actualByCategory = new Map<string, number>();
    for (const e of expenses ?? []) {
      if (e.status === "APPROVED" || e.status === "PAID") {
        actualByCategory.set(e.category, (actualByCategory.get(e.category) ?? 0) + Number(e.amount));
      }
    }

    return (lines ?? []).map((line) => {
      const category = line.category as BudgetCategory;
      const budgetedAmount = Number(line.budgeted_amount);
      const committedAmount = committedByCategory[category] ?? 0;
      const actualAmount = actualByCategory.get(category) ?? 0;
      return { category, budgetedAmount, committedAmount, actualAmount, remainingAmount: budgetedAmount - actualAmount, varianceAmount: actualAmount - budgetedAmount };
    });
  },
};
