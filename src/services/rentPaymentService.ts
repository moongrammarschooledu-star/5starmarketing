import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import { rentScheduleService } from "./rentScheduleService";
import { leaseService } from "./leaseService";
import { financialTransactionService } from "./financialTransactionService";
import { RENT_PAYMENT_ALLOWED_TRANSITIONS } from "@/lib/models/rental";
import type { RentPayment, RentPaymentInput, RentPaymentStatus } from "@/lib/models/rental";

const SELECT = "*, tenants(name), rental_properties(properties(title)), recorder:admin_profiles!rent_payments_recorded_by_fkey(name), confirmer:admin_profiles!rent_payments_confirmed_by_fkey(name)";

function mapPaymentMethodToTransaction(method: string): "Cash" | "Bank Transfer" | "Cheque" | "Online Transfer" | "Card" | "Other" {
  if (method === "Online Payment") return "Online Transfer";
  if (method === "Cash" || method === "Bank Transfer" || method === "Cheque" || method === "Other") return method;
  return "Other";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentPayment {
  return {
    id: row.id,
    paymentNumber: row.payment_number,
    leaseId: row.lease_id,
    rentScheduleId: row.rent_schedule_id ?? undefined,
    tenantId: row.tenant_id,
    tenantName: row.tenants?.name ?? undefined,
    rentalPropertyId: row.rental_property_id,
    propertyTitle: row.rental_properties?.properties?.title ?? undefined,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number ?? undefined,
    status: row.status,
    transactionId: row.transaction_id ?? undefined,
    notes: row.notes ?? undefined,
    recordedByName: row.recorder?.name ?? undefined,
    confirmedByName: row.confirmer?.name ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: RentPaymentStatus, to: RentPaymentStatus) {
  if (!RENT_PAYMENT_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a rent payment from ${from} to ${to}.`);
  }
}

export const rentPaymentService = {
  async listForLease(leaseId: string): Promise<RentPayment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_payments").select(SELECT).eq("lease_id", leaseId).order("payment_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async list(filters?: { status?: RentPaymentStatus; tenantId?: string; rentalPropertyId?: string }): Promise<RentPayment[]> {
    const supabase = await createClient();
    let query = supabase.from("rent_payments").select(SELECT).order("payment_date", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.tenantId) query = query.eq("tenant_id", filters.tenantId);
    if (filters?.rentalPropertyId) query = query.eq("rental_property_id", filters.rentalPropertyId);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentPayment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_payments").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Section 14 — a payment tied to a specific rent period may never
   *  push that period's total collected past its total_due (no implicit
   *  credit/advance handling); a payment left unlinked to any period is
   *  treated as an explicit advance/lump sum and is not capped. */
  async create(input: RentPaymentInput, actorId: string): Promise<RentPayment> {
    const lease = await leaseService.getById(input.leaseId);
    if (!lease) throw new Error("Lease not found.");

    if (input.rentScheduleId) {
      const schedule = await rentScheduleService.getById(input.rentScheduleId);
      if (!schedule) throw new Error("Rent period not found.");
      const outstanding = schedule.outstanding ?? schedule.totalDue;
      if (input.amount > outstanding + 0.01) {
        throw new Error(`This payment (${input.amount}) would exceed the outstanding amount (${outstanding}) for this rent period.`);
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rent_payments")
      .insert({
        lease_id: input.leaseId,
        rent_schedule_id: input.rentScheduleId || null,
        tenant_id: lease.tenantId,
        rental_property_id: lease.rentalPropertyId,
        amount: input.amount,
        payment_date: input.paymentDate || new Date().toISOString().slice(0, 10),
        payment_method: input.paymentMethod,
        reference_number: input.referenceNumber || null,
        notes: input.notes || null,
        recorded_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("rentPaymentService.create failed:", error);
      throw new Error("Could not record this payment.");
    }
    const payment = mapRow(data);
    await rentalAuditService.log({ entityType: "rent_payment", entityId: payment.id, action: "Recorded (pending)", actorId, newValue: { amount: payment.amount } });
    return payment;
  },

  /** Section 12 — only a CONFIRMED payment ever counts as collected
   *  rent; confirming posts a real INCOME transaction against the
   *  existing seeded '4020 Property Rentals' account, never a parallel
   *  ledger. */
  async confirm(id: string, actorId: string, actorName: string): Promise<RentPayment> {
    const payment = await this.getById(id);
    if (!payment) throw new Error("Payment not found.");
    assertTransition(payment.status, "CONFIRMED");

    const supabase = await createClient();
    const { data: account } = await supabase.from("accounts").select("id").eq("account_code", "4020").maybeSingle();
    if (!account) throw new Error("The Property Rentals income account could not be found.");
    const { data: tenantRow } = await supabase.from("tenants").select("customer_id").eq("id", payment.tenantId).maybeSingle();
    const { data: rentalPropertyRow } = await supabase.from("rental_properties").select("property_id").eq("id", payment.rentalPropertyId).maybeSingle();

    const transaction = await financialTransactionService.create(
      {
        transactionType: "INCOME",
        accountId: account.id,
        customerId: tenantRow?.customer_id ?? undefined,
        propertyId: rentalPropertyRow?.property_id ?? undefined,
        amount: payment.amount,
        paymentMethod: mapPaymentMethodToTransaction(payment.paymentMethod),
        referenceNumber: payment.referenceNumber,
        transactionDate: payment.paymentDate,
        description: `Rent payment ${payment.paymentNumber}`,
        status: "CONFIRMED",
      },
      actorId
    );

    const { data, error } = await supabase
      .from("rent_payments")
      .update({ status: "CONFIRMED", transaction_id: transaction.id, confirmed_by: actorId, confirmed_at: new Date().toISOString() })
      .eq("id", id)
      .select(SELECT)
      .maybeSingle();
    if (error || !data) throw new Error("Could not confirm this payment.");

    if (payment.rentScheduleId) await rentScheduleService.refreshStatus(payment.rentScheduleId);
    await rentalAuditService.log({ entityType: "rent_payment", entityId: id, action: "Confirmed", actorId, actorName, newValue: { transactionId: transaction.id } });
    return mapRow(data);
  },

  async markFailed(id: string, actorId: string, actorName: string): Promise<void> {
    const payment = await this.getById(id);
    if (!payment) throw new Error("Payment not found.");
    assertTransition(payment.status, "FAILED");
    const supabase = await createClient();
    const { error } = await supabase.from("rent_payments").update({ status: "FAILED" }).eq("id", id);
    if (error) throw new Error("Could not update this payment.");
    await rentalAuditService.log({ entityType: "rent_payment", entityId: id, action: "Marked failed", actorId, actorName });
  },

  /** Reverses a confirmed payment (data-entry correction) — the linked
   *  financial_transactions row is reversed with a NEW linked entry,
   *  never edited (section 51's own "never modify" discipline). */
  async reverse(id: string, reason: string, actorId: string, actorName: string): Promise<void> {
    const payment = await this.getById(id);
    if (!payment) throw new Error("Payment not found.");
    assertTransition(payment.status, "REVERSED");
    if (payment.transactionId) await financialTransactionService.reverse(payment.transactionId, reason, actorId, actorName);
    const supabase = await createClient();
    const { error } = await supabase.from("rent_payments").update({ status: "REVERSED" }).eq("id", id);
    if (error) throw new Error("Could not reverse this payment.");
    if (payment.rentScheduleId) await rentScheduleService.refreshStatus(payment.rentScheduleId);
    await rentalAuditService.log({ entityType: "rent_payment", entityId: id, action: "Reversed", actorId, actorName, reason });
  },

  async refund(id: string, reason: string, actorId: string, actorName: string): Promise<void> {
    const payment = await this.getById(id);
    if (!payment) throw new Error("Payment not found.");
    assertTransition(payment.status, "REFUNDED");
    const supabase = await createClient();
    const { data: account } = await supabase.from("accounts").select("id").eq("account_code", "4020").maybeSingle();
    await financialTransactionService.create(
      { transactionType: "REFUND", accountId: account?.id, amount: payment.amount, transactionDate: new Date().toISOString().slice(0, 10), description: `Refund of ${payment.paymentNumber}: ${reason}` },
      actorId
    );
    const { error } = await supabase.from("rent_payments").update({ status: "REFUNDED" }).eq("id", id);
    if (error) throw new Error("Could not refund this payment.");
    if (payment.rentScheduleId) await rentScheduleService.refreshStatus(payment.rentScheduleId);
    await rentalAuditService.log({ entityType: "rent_payment", entityId: id, action: "Refunded", actorId, actorName, reason });
  },
};
