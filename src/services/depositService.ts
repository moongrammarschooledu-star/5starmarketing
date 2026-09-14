import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { SecurityDeposit, DepositTransaction, DepositTransactionInput, DepositStatus } from "@/lib/models/rental";

const SELECT = "*, leases(lease_number), tenants(name), rental_properties(properties(title))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SecurityDeposit {
  return {
    id: row.id,
    leaseId: row.lease_id,
    leaseNumber: row.leases?.lease_number ?? undefined,
    tenantId: row.tenant_id,
    tenantName: row.tenants?.name ?? undefined,
    rentalPropertyId: row.rental_property_id,
    propertyTitle: row.rental_properties?.properties?.title ?? undefined,
    amount: Number(row.amount),
    receivedDate: row.received_date ?? undefined,
    status: row.status,
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
    refundDate: row.refund_date ?? undefined,
    refundReason: row.refund_reason ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransactionRow(row: any): DepositTransaction {
  return {
    id: row.id,
    securityDepositId: row.security_deposit_id,
    transactionType: row.transaction_type,
    amount: Number(row.amount),
    reason: row.reason ?? undefined,
    evidenceDocumentId: row.evidence_document_id ?? undefined,
    approvedByName: row.approver?.name ?? undefined,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
  };
}

export const depositService = {
  async list(filters?: { status?: DepositStatus }): Promise<SecurityDeposit[]> {
    const supabase = await createClient();
    let query = supabase.from("security_deposits").select(SELECT).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SecurityDeposit | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("security_deposits").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async getByLease(leaseId: string): Promise<SecurityDeposit | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("security_deposits").select(SELECT).eq("lease_id", leaseId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async markReceived(id: string, receivedDate: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("security_deposits").update({ status: "RECEIVED", received_date: receivedDate }).eq("id", id);
    if (error) throw new Error("Could not mark this deposit as received.");
    await supabase.from("deposit_transactions").insert({ security_deposit_id: id, transaction_type: "RECEIVED", amount: (await this.getById(id))?.amount ?? 0, transaction_date: receivedDate, approved_by: actorId });
    await rentalAuditService.log({ entityType: "security_deposit", entityId: id, action: "Received", actorId, actorName });
  },

  async setHeld(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("security_deposits").update({ status: "HELD" }).eq("id", id);
    if (error) throw new Error("Could not update this deposit's status.");
  },

  /** Section 15/16 — deductions/refunds always require an authorized
   *  admin approval and, for deductions, evidence — never automatic. */
  async recordTransaction(depositId: string, input: DepositTransactionInput, actorId: string, actorName: string): Promise<DepositTransaction> {
    const deposit = await this.getById(depositId);
    if (!deposit) throw new Error("Security deposit not found.");
    if (input.transactionType === "DEDUCTION" && !input.reason) throw new Error("A deduction requires a reason.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deposit_transactions")
      .insert({
        security_deposit_id: depositId,
        transaction_type: input.transactionType,
        amount: input.amount,
        reason: input.reason || null,
        evidence_document_id: input.evidenceDocumentId || null,
        approved_by: actorId,
        transaction_date: input.transactionDate || new Date().toISOString().slice(0, 10),
      })
      .select("*")
      .single();
    if (error) {
      console.error("depositService.recordTransaction failed:", error);
      throw new Error("Could not record this deposit transaction.");
    }

    const deductionsAndRefunds = await this.sumTransactions(depositId, ["DEDUCTION", "REFUND"]);
    let nextStatus: DepositStatus = deposit.status;
    const statusRow: Record<string, unknown> = {};
    if (input.transactionType === "REFUND") {
      const totalRefunded = deductionsAndRefunds.refund;
      statusRow.refund_amount = totalRefunded;
      statusRow.refund_date = input.transactionDate || new Date().toISOString().slice(0, 10);
      statusRow.refund_reason = input.reason || null;
      nextStatus = totalRefunded >= deposit.amount - deductionsAndRefunds.deduction ? "REFUNDED" : "PARTIALLY_REFUNDED";
    } else if (input.transactionType === "DEDUCTION" && deductionsAndRefunds.deduction >= deposit.amount) {
      nextStatus = "FORFEITED";
    }
    statusRow.status = nextStatus;
    await supabase.from("security_deposits").update(statusRow).eq("id", depositId);

    await rentalAuditService.log({ entityType: "security_deposit", entityId: depositId, action: `${input.transactionType} recorded`, actorId, actorName, newValue: { amount: input.amount, reason: input.reason } });
    return mapTransactionRow(data);
  },

  async sumTransactions(depositId: string, types: ("RECEIVED" | "DEDUCTION" | "REFUND")[]): Promise<{ received: number; deduction: number; refund: number }> {
    const supabase = await createClient();
    const { data } = await supabase.from("deposit_transactions").select("transaction_type, amount").eq("security_deposit_id", depositId).in("transaction_type", types);
    const totals = { received: 0, deduction: 0, refund: 0 };
    for (const row of data ?? []) {
      if (row.transaction_type === "RECEIVED") totals.received += Number(row.amount);
      else if (row.transaction_type === "DEDUCTION") totals.deduction += Number(row.amount);
      else if (row.transaction_type === "REFUND") totals.refund += Number(row.amount);
    }
    return totals;
  },

  async listTransactions(depositId: string): Promise<DepositTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deposit_transactions").select("*, approver:admin_profiles!deposit_transactions_approved_by_fkey(name)").eq("security_deposit_id", depositId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapTransactionRow);
  },
};
