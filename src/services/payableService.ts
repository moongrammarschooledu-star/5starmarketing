import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialTransactionService } from "./financialTransactionService";
import { financialAuditService } from "./financialAuditService";
import type { Payable, PayableInput, PayableStatus } from "@/lib/models/accounting";

const SELECT = "*, properties(title), projects(name), deals(deal_number), admin_profiles!payables_created_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Payable {
  return {
    id: row.id,
    payableNumber: row.payable_number,
    vendor: row.vendor,
    description: row.description ?? undefined,
    amount: Number(row.amount),
    dueDate: row.due_date ?? undefined,
    paidAmount: Number(row.paid_amount),
    outstandingAmount: Number(row.outstanding_amount),
    status: row.status,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    agentCommissionId: row.agent_commission_id ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const payableService = {
  async list(status?: PayableStatus): Promise<Payable[]> {
    const supabase = await createClient();
    let query = supabase.from("payables").select(SELECT).order("due_date", { ascending: true, nullsFirst: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      console.error("payableService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<Payable | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("payables").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: PayableInput, actorId?: string, actorName?: string): Promise<Payable> {
    if (input.amount < 0) throw new Error("Amount cannot be negative.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payables")
      .insert({
        vendor: input.vendor,
        description: input.description || null,
        amount: input.amount,
        due_date: input.dueDate || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        notes: input.notes || null,
        created_by: actorId || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("payableService.create failed:", error);
      throw new Error("Could not create this payable.");
    }
    const payable = mapRow(data);
    await financialAuditService.log({ entityType: "payable", entityId: payable.id, action: "Created", actorId, actorName, newValue: { vendor: payable.vendor, amount: payable.amount } });
    return payable;
  },

  async approve(id: string, actorId?: string, actorName?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("payables").update({ status: "APPROVED" }).eq("id", id).in("status", ["DRAFT", "PENDING"]);
    if (error) throw new Error("Could not approve this payable.");
    await financialAuditService.log({ entityType: "payable", entityId: id, action: "Approved", actorId, actorName });
  },

  async cancel(id: string, actorId?: string, actorName?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("payables").update({ status: "CANCELLED" }).eq("id", id).in("status", ["DRAFT", "PENDING", "APPROVED"]);
    if (error) throw new Error("Could not cancel this payable — it may already have recorded payments.");
    await financialAuditService.log({ entityType: "payable", entityId: id, action: "Cancelled", actorId, actorName });
  },

  /** Records one payment installment against a payable — writes a
   *  matching CONFIRMED financial_transactions row (never trusts the
   *  browser for the resulting balance; outstanding_amount is a
   *  generated column). */
  async recordPayment(id: string, amount: number, actorId: string, actorName: string, paymentMethod?: string, referenceNumber?: string): Promise<Payable> {
    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const payable = await this.getById(id);
    if (!payable) throw new Error("Payable not found.");
    if (!["PENDING", "APPROVED", "PARTIALLY_PAID", "OVERDUE"].includes(payable.status)) throw new Error(`A ${payable.status} payable cannot receive a payment.`);
    if (amount > payable.outstandingAmount) throw new Error(`Payment cannot exceed the outstanding balance of ${payable.outstandingAmount}.`);

    const newPaid = payable.paidAmount + amount;
    const status: PayableStatus = newPaid >= payable.amount ? "PAID" : "PARTIALLY_PAID";

    await financialTransactionService.create(
      {
        transactionType: "PAYABLE",
        propertyId: payable.propertyId,
        projectId: payable.projectId,
        dealId: payable.dealId,
        amount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paymentMethod: paymentMethod as any,
        referenceNumber,
        description: `Payment against payable ${payable.payableNumber} (${payable.vendor})`,
        status: "CONFIRMED",
      },
      actorId
    );

    const supabase = await createClient();
    const { data, error } = await supabase.from("payables").update({ paid_amount: newPaid, status }).eq("id", id).select(SELECT).single();
    if (error) throw new Error("Could not record this payment.");
    await financialAuditService.log({ entityType: "payable", entityId: id, action: "Payment recorded", actorId, actorName, newValue: { amount, newStatus: status } });
    return mapRow(data);
  },

  /** Opportunistic sweep (no background job runner in this deployment,
   *  same established pattern as followUpService.markOverdue) — marks
   *  payables past their due date as OVERDUE. */
  async markOverdue(): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("payables")
      .update({ status: "OVERDUE" })
      .lt("due_date", today)
      .in("status", ["PENDING", "APPROVED", "PARTIALLY_PAID"])
      .select("id");
    if (error) return 0;
    return data?.length ?? 0;
  },
};
