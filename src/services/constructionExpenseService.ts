import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { expenseService } from "./expenseService";
import { CONSTRUCTION_EXPENSE_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionExpense, ConstructionExpenseInput, ConstructionExpenseStatus } from "@/lib/models/construction";

const SELECT = "*, construction_phases(name), maintenance_vendors(business_name), construction_contractors(maintenance_vendors(business_name))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionExpense {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    boqItemId: row.boq_item_id ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.maintenance_vendors?.business_name ?? undefined,
    contractorId: row.contractor_id ?? undefined,
    contractorName: row.construction_contractors?.maintenance_vendors?.business_name ?? undefined,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    status: row.status,
    expenseId: row.expense_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: ConstructionExpenseStatus, to: ConstructionExpenseStatus) {
  if (!CONSTRUCTION_EXPENSE_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a construction expense from ${from} to ${to}.`);
  }
}

export const constructionExpenseService = {
  async list(projectId: string): Promise<ConstructionExpense[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_expenses").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<ConstructionExpense | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_expenses").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(projectId: string, input: ConstructionExpenseInput, actorId: string, actorName: string): Promise<ConstructionExpense> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_expenses")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        boq_item_id: input.boqItemId || null,
        vendor_id: input.vendorId || null,
        contractor_id: input.contractorId || null,
        category: input.category,
        description: input.description,
        amount: input.amount,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionExpenseService.create failed:", error);
      throw new Error("Could not create this expense.");
    }
    const expense = mapRow(data);
    await constructionAuditService.log({ entityType: "expense", entityId: expense.id, action: "Created (draft)", actorId, actorName, newValue: { amount: expense.amount, category: expense.category } });
    return expense;
  },

  async updateStatus(id: string, newStatus: ConstructionExpenseStatus, actorId: string, actorName: string): Promise<ConstructionExpense> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, newStatus);

    const supabase = await createClient();

    if (newStatus === "PAID") {
      if (expense.expenseId) throw new Error("This expense has already been paid.");
      // Reuses the EXISTING accounting expense workflow end-to-end
      // (never a parallel ledger) — see migration DESIGN NOTES.
      const { data: account } = await supabase.from("accounts").select("id").eq("account_code", "5050").maybeSingle();
      if (!account) throw new Error("The Construction expense account could not be found.");
      const realExpense = await expenseService.create({ expenseDate: new Date().toISOString().slice(0, 10), accountId: account.id, description: `${expense.description} (Construction)`, amount: expense.amount, vendor: expense.vendorName ?? expense.contractorName }, actorId, actorName, false);
      await expenseService.approve(realExpense.id, actorId, actorName);
      const paidExpense = await expenseService.markPaid(realExpense.id, actorId, actorName);
      const { data, error } = await supabase.from("construction_expenses").update({ status: "PAID", expense_id: paidExpense.id }).eq("id", id).select(SELECT).maybeSingle();
      if (error || !data) throw new Error("Could not mark this expense as paid.");
      await constructionAuditService.log({ entityType: "expense", entityId: id, action: "Paid", actorId, actorName, newValue: { expenseId: paidExpense.id } });
      return mapRow(data);
    }

    const { data, error } = await supabase.from("construction_expenses").update({ status: newStatus }).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this expense's status.");
    await constructionAuditService.log({ entityType: "expense", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: expense.status } });
    return mapRow(data);
  },
};
