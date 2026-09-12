import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialTransactionService } from "./financialTransactionService";
import type { DealPayment, DealPaymentInput, DealPaymentRefund } from "@/lib/models/deal";
import type { FinancePaymentMethod } from "@/lib/models/accounting";

/** STEP 23 accounting integration (section 13) — best-effort, mirrors
 *  every other cross-cutting side effect in this codebase (notifications,
 *  communication triggers): a failure here is logged but never blocks
 *  the payment/refund workflow itself. */
async function recordAccountingEntry(
  transactionType: "INCOME" | "REFUND",
  dealId: string,
  paymentId: string,
  amount: number,
  paymentMethod: string,
  description: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: deal } = await supabase.from("deals").select("customer_id, property_id, project_id, agent_id, deal_number").eq("id", dealId).maybeSingle();
    await financialTransactionService.create({
      transactionType,
      dealId,
      customerId: deal?.customer_id ?? undefined,
      propertyId: deal?.property_id ?? undefined,
      projectId: deal?.project_id ?? undefined,
      agentId: deal?.agent_id ?? undefined,
      paymentId,
      amount,
      paymentMethod: paymentMethod as FinancePaymentMethod,
      description: `${description}${deal?.deal_number ? ` (deal ${deal.deal_number})` : ""}`,
      status: "CONFIRMED",
    });
  } catch (e) {
    console.error("dealPaymentService: accounting entry failed (payment/refund itself is unaffected):", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DealPayment {
  return {
    id: row.id,
    dealId: row.deal_id,
    scheduleItemId: row.schedule_item_id ?? undefined,
    amount: Number(row.amount),
    paymentType: row.payment_type,
    paymentMethod: row.payment_method,
    reference: row.reference ?? undefined,
    paymentDate: row.payment_date,
    status: row.status,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    recordedByName: row.recorded_by_admin?.name ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
    verifiedByName: row.verified_by_admin?.name ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRefundRow(row: any): DealPaymentRefund {
  return {
    id: row.id,
    paymentId: row.payment_id,
    dealId: row.deal_id,
    amount: Number(row.amount),
    refundDate: row.refund_date,
    reason: row.reason ?? undefined,
    reference: row.reference ?? undefined,
    status: row.status,
    createdBy: row.created_by ?? undefined,
    createdByName: row.created_by_admin?.name ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_JOINS =
  "*, recorded_by_admin:admin_profiles!deal_payments_recorded_by_fkey(name), verified_by_admin:admin_profiles!deal_payments_verified_by_fkey(name)";

export const dealPaymentService = {
  async listByDeal(dealId: string): Promise<DealPayment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_payments")
      .select(SELECT_WITH_JOINS)
      .eq("deal_id", dealId)
      .order("payment_date", { ascending: false });
    if (error) {
      console.error("dealPaymentService.listByDeal failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<DealPayment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deal_payments").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(dealId: string, input: DealPaymentInput, recordedByAdminId?: string): Promise<DealPayment> {
    if (input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_payments")
      .insert({
        deal_id: dealId,
        schedule_item_id: input.scheduleItemId || null,
        amount: input.amount,
        payment_type: input.paymentType,
        payment_method: input.paymentMethod,
        reference: input.reference || null,
        payment_date: input.paymentDate,
        status: input.status ?? "Received",
        notes: input.notes || null,
        recorded_by: recordedByAdminId || null,
      })
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) {
      console.error("dealPaymentService.create failed:", error);
      throw new Error("Could not record this payment.");
    }
    return mapRow(data);
  },

  /** Marking a payment Verified/Rejected is the only allowed edit after
   *  creation (section 17/29) — amount/type/method/date are immutable
   *  once recorded; corrections go through a refund, never a silent
   *  overwrite. */
  async setStatus(id: string, status: "Verified" | "Rejected", verifiedByAdminId?: string): Promise<DealPayment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_payments")
      .update({ status, verified_by: verifiedByAdminId || null, verified_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("dealPaymentService.setStatus failed:", error);
      throw new Error("Could not update this payment's status.");
    }
    const payment = data ? mapRow(data) : undefined;
    if (payment && status === "Verified") {
      await recordAccountingEntry("INCOME", payment.dealId, payment.id, payment.amount, payment.paymentMethod, `${payment.paymentType} payment`);
    }
    return payment;
  },

  async listRefunds(dealId: string): Promise<DealPaymentRefund[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_payment_refunds")
      .select("*, created_by_admin:admin_profiles!deal_payment_refunds_created_by_fkey(name)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("dealPaymentService.listRefunds failed:", error);
      return [];
    }
    return (data ?? []).map(mapRefundRow);
  },

  /** A linked reversal record (section 32) — the original payment row
   *  is never deleted or edited. */
  async refund(
    paymentId: string,
    dealId: string,
    input: { amount: number; reason?: string; reference?: string },
    createdByAdminId?: string
  ): Promise<DealPaymentRefund> {
    if (input.amount <= 0) throw new Error("Refund amount must be greater than zero.");
    const payment = await this.getById(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.status !== "Verified") throw new Error("Only a verified payment can be refunded.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_payment_refunds")
      .insert({
        payment_id: paymentId,
        deal_id: dealId,
        amount: input.amount,
        reason: input.reason || null,
        reference: input.reference || null,
        status: "Completed",
        created_by: createdByAdminId || null,
      })
      .select("*, created_by_admin:admin_profiles!deal_payment_refunds_created_by_fkey(name)")
      .single();
    if (error) {
      console.error("dealPaymentService.refund failed:", error);
      throw new Error("Could not record this refund.");
    }
    const refund = mapRefundRow(data);
    await recordAccountingEntry("REFUND", dealId, paymentId, refund.amount, payment.paymentMethod, "Payment refund");
    return refund;
  },
};
