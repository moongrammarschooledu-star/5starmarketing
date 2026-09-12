import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialAuditService } from "./financialAuditService";
import type { ReconciliationRecord, ReconciliationStatus } from "@/lib/models/accounting";

const SELECT = "*, financial_transactions(transaction_number, amount, transaction_date), admin_profiles(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ReconciliationRecord {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    transactionNumber: row.financial_transactions?.transaction_number ?? undefined,
    transactionAmount: row.financial_transactions ? Number(row.financial_transactions.amount) : undefined,
    transactionDate: row.financial_transactions?.transaction_date ?? undefined,
    statementReference: row.statement_reference ?? undefined,
    matchedAmount: row.matched_amount != null ? Number(row.matched_amount) : undefined,
    reconciliationStatus: row.reconciliation_status,
    reconciledBy: row.reconciled_by ?? undefined,
    reconciledByName: row.admin_profiles?.name ?? undefined,
    reconciledAt: row.reconciled_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const reconciliationService = {
  async list(status?: ReconciliationStatus): Promise<ReconciliationRecord[]> {
    const supabase = await createClient();
    let query = supabase.from("reconciliation_records").select(SELECT).order("created_at", { ascending: false });
    if (status) query = query.eq("reconciliation_status", status);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** A CONFIRMED transaction not yet reconciled shows up here on
   *  demand — no need to pre-create a row for every transaction. */
  async listUnreconciledTransactions(): Promise<{ id: string; transactionNumber: string; amount: number; transactionDate: string; description?: string }[]> {
    const supabase = await createClient();
    const { data: reconciled } = await supabase.from("reconciliation_records").select("transaction_id");
    const reconciledIds = (reconciled ?? []).map((r) => r.transaction_id);
    let query = supabase.from("financial_transactions").select("id, transaction_number, amount, transaction_date, description").eq("status", "CONFIRMED").order("transaction_date", { ascending: false }).limit(200);
    if (reconciledIds.length > 0) query = query.not("id", "in", `(${reconciledIds.join(",")})`);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map((r) => ({ id: r.id, transactionNumber: r.transaction_number, amount: Number(r.amount), transactionDate: r.transaction_date, description: r.description ?? undefined }));
  },

  /** Never auto-marks anything reconciled (section 45) — every record
   *  here is an explicit admin action. */
  async record(transactionId: string, status: ReconciliationStatus, actorId: string, actorName: string, input?: { statementReference?: string; matchedAmount?: number; notes?: string }): Promise<ReconciliationRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reconciliation_records")
      .insert({
        transaction_id: transactionId,
        statement_reference: input?.statementReference || null,
        matched_amount: input?.matchedAmount ?? null,
        reconciliation_status: status,
        reconciled_by: actorId,
        reconciled_at: new Date().toISOString(),
        notes: input?.notes || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("reconciliationService.record failed:", error);
      throw new Error("Could not save this reconciliation record.");
    }
    const record = mapRow(data);
    await financialAuditService.log({ entityType: "reconciliation", entityId: record.id, action: `Marked ${status}`, actorId, actorName });
    return record;
  },
};
