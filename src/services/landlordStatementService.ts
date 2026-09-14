import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import { landlordService } from "./landlordService";
import type { LandlordStatement, LandlordStatementGenerateInput } from "@/lib/models/rental";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SELECT = "*, landlords(name), generator:admin_profiles!landlord_statements_generated_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LandlordStatement {
  return {
    id: row.id,
    statementNumber: row.statement_number,
    landlordId: row.landlord_id,
    landlordName: row.landlords?.name ?? undefined,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    openingBalance: Number(row.opening_balance),
    rentCollected: Number(row.rent_collected),
    otherIncome: Number(row.other_income),
    maintenanceExpenses: Number(row.maintenance_expenses),
    managementFees: Number(row.management_fees),
    otherExpenses: Number(row.other_expenses),
    adjustments: Number(row.adjustments),
    netAmount: Number(row.net_amount),
    closingBalance: Number(row.closing_balance),
    status: row.status,
    generatedByName: row.generator?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const landlordStatementService = {
  async listForLandlord(landlordId: string, finalizedOnly = false): Promise<LandlordStatement[]> {
    const supabase = await createClient();
    let query = supabase.from("landlord_statements").select(SELECT).eq("landlord_id", landlordId).order("period_start", { ascending: false });
    if (finalizedOnly) query = query.eq("status", "FINALIZED");
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<LandlordStatement | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("landlord_statements").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Section 30 — carries a real opening balance forward from the most
   *  recent FINALIZED statement; every other figure is computed live
   *  from real rent_payments/expenses/lease fee configuration, never
   *  invented. Management fee is applied per-payment using that
   *  payment's own lease's fee override (falling back to the
   *  landlord's default), never a single flat guess. */
  async generate(input: LandlordStatementGenerateInput, actorId: string): Promise<LandlordStatement> {
    const landlord = await landlordService.getById(input.landlordId);
    if (!landlord) throw new Error("Landlord not found.");

    const supabase = await createClient();
    const { data: rentalProps } = await supabase.from("rental_properties").select("id, property_id").eq("landlord_id", input.landlordId);
    const rentalPropertyIds = (rentalProps ?? []).map((r) => r.id);
    const propertyIds = (rentalProps ?? []).map((r) => r.property_id);

    const { data: previous } = await supabase
      .from("landlord_statements")
      .select("closing_balance")
      .eq("landlord_id", input.landlordId)
      .eq("status", "FINALIZED")
      .lt("period_end", input.periodStart)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    const openingBalance = previous ? Number(previous.closing_balance) : 0;

    let rentCollected = 0;
    let managementFees = 0;
    if (rentalPropertyIds.length > 0) {
      const { data: payments } = await supabase
        .from("rent_payments")
        .select("amount, lease_id")
        .eq("status", "CONFIRMED")
        .in("rental_property_id", rentalPropertyIds)
        .gte("payment_date", input.periodStart)
        .lte("payment_date", input.periodEnd);

      const leaseIds = Array.from(new Set((payments ?? []).map((p) => p.lease_id)));
      const { data: leases } = leaseIds.length > 0 ? await supabase.from("leases").select("id, management_fee_type, management_fee_value").in("id", leaseIds) : { data: [] };
      const feeByLease = new Map((leases ?? []).map((l) => [l.id, { type: l.management_fee_type, value: l.management_fee_value }]));

      for (const p of payments ?? []) {
        const amount = Number(p.amount);
        rentCollected += amount;
        const override = feeByLease.get(p.lease_id);
        const feeType = override?.type ?? landlord.managementFeeType;
        const feeValue = override?.value != null ? Number(override.value) : landlord.managementFeeValue;
        if (feeType === "PERCENTAGE") managementFees += (amount * feeValue) / 100;
        else if (feeType === "FIXED") managementFees += 0; // a fixed fee is charged once per period, added below — never per payment.
      }
      if (landlord.managementFeeType === "FIXED") managementFees += landlord.managementFeeValue;
    }

    let maintenanceExpenses = 0;
    let expenseAccountOtherExpenses = 0;
    if (propertyIds.length > 0) {
      const { data: accounts } = await supabase.from("accounts").select("id, account_code").in("account_code", ["5090", "5200"]);
      const maintenanceAccountId = accounts?.find((a) => a.account_code === "5090")?.id;
      const rentalExpenseAccountId = accounts?.find((a) => a.account_code === "5200")?.id;
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, account_id")
        .in("property_id", propertyIds)
        .in("status", ["APPROVED", "PAID"])
        .gte("expense_date", input.periodStart)
        .lte("expense_date", input.periodEnd);
      for (const e of expenses ?? []) {
        if (e.account_id === maintenanceAccountId) maintenanceExpenses += Number(e.amount);
        else if (e.account_id === rentalExpenseAccountId) expenseAccountOtherExpenses += Number(e.amount);
      }
    }

    const otherIncome = round2(input.otherIncome ?? 0);
    const otherExpenses = round2(expenseAccountOtherExpenses + (input.otherExpenses ?? 0));
    const adjustments = round2(input.adjustments ?? 0);

    const { data, error } = await supabase
      .from("landlord_statements")
      .insert({
        landlord_id: input.landlordId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        opening_balance: round2(openingBalance),
        rent_collected: round2(rentCollected),
        other_income: otherIncome,
        maintenance_expenses: round2(maintenanceExpenses),
        management_fees: round2(managementFees),
        other_expenses: otherExpenses,
        adjustments,
        generated_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("landlordStatementService.generate failed:", error);
      if (error.code === "23505") throw new Error("A statement for this landlord and period already exists.");
      throw new Error("Could not generate this statement.");
    }
    const statement = mapRow(data);
    await rentalAuditService.log({ entityType: "landlord_statement", entityId: statement.id, action: "Generated", actorId, newValue: { netAmount: statement.netAmount } });
    return statement;
  },

  async finalize(id: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("landlord_statements").update({ status: "FINALIZED" }).eq("id", id).eq("status", "DRAFT");
    if (error) throw new Error("Could not finalize this statement.");
    await rentalAuditService.log({ entityType: "landlord_statement", entityId: id, action: "Finalized", actorId, actorName });
  },
};
