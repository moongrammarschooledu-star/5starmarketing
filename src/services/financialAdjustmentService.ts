import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialTransactionService } from "./financialTransactionService";
import { financialAuditService } from "./financialAuditService";
import type { FinancialAdjustment, FinancialAdjustmentInput } from "@/lib/models/accounting";

const SELECT = "*, deals(deal_number), admin_profiles(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FinancialAdjustment {
  return {
    id: row.id,
    adjustmentNumber: row.adjustment_number,
    adjustmentType: row.adjustment_type,
    amount: Number(row.amount),
    reason: row.reason,
    reference: row.reference ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const financialAdjustmentService = {
  async list(limit = 100): Promise<FinancialAdjustment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("financial_adjustments").select(SELECT).order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** Section 48 — always produces a linked, auditable
   *  financial_transactions row (type ADJUSTMENT); requires a reason. */
  async create(input: FinancialAdjustmentInput, actorId: string, actorName: string): Promise<FinancialAdjustment> {
    if (!input.reason?.trim()) throw new Error("A reason is required for a financial adjustment.");

    const transaction = await financialTransactionService.create(
      {
        transactionType: "ADJUSTMENT",
        dealId: input.dealId,
        propertyId: input.propertyId,
        projectId: input.projectId,
        customerId: input.customerId,
        amount: Math.abs(input.amount),
        description: `Adjustment (${input.adjustmentType}): ${input.reason}`,
        status: "CONFIRMED",
      },
      actorId
    );

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_adjustments")
      .insert({
        adjustment_type: input.adjustmentType,
        amount: input.amount,
        reason: input.reason,
        reference: input.reference || null,
        deal_id: input.dealId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        customer_id: input.customerId || null,
        transaction_id: transaction.id,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("financialAdjustmentService.create failed:", error);
      throw new Error("Could not create this adjustment.");
    }
    const adjustment = mapRow(data);
    await financialAuditService.log({ entityType: "adjustment", entityId: adjustment.id, action: "Created", actorId, actorName, newValue: { type: adjustment.adjustmentType, amount: adjustment.amount }, reason: input.reason });
    return adjustment;
  },
};
