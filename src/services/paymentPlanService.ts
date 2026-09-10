import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PaymentPlan, PaymentPlanInput, PaymentScheduleItem, PaymentScheduleItemInput } from "@/lib/models/paymentPlan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PaymentPlan {
  return {
    id: row.id,
    propertyId: row.property_id,
    paymentOption: row.payment_option,
    calculationType: row.calculation_type,
    propertyPrice: Number(row.property_price),
    downPayment: Number(row.down_payment),
    bookingFee: row.booking_fee !== null ? Number(row.booking_fee) : undefined,
    confirmationFee: row.confirmation_fee !== null ? Number(row.confirmation_fee) : undefined,
    processingFee: row.processing_fee !== null ? Number(row.processing_fee) : undefined,
    additionalCharges: row.additional_charges !== null ? Number(row.additional_charges) : undefined,
    additionalChargesDescription: row.additional_charges_description ?? undefined,
    installmentFrequency: row.installment_frequency,
    duration: row.duration,
    installmentAmount: row.installment_amount !== null ? Number(row.installment_amount) : undefined,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScheduleRow(row: any): PaymentScheduleItem {
  return {
    id: row.id,
    paymentPlanId: row.payment_plan_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date ?? undefined,
    amount: Number(row.amount),
    description: row.description ?? "",
    createdAt: row.created_at,
  };
}

function mapInputToRow(input: Partial<PaymentPlanInput>) {
  const row: Record<string, unknown> = {};
  if (input.paymentOption !== undefined) row.payment_option = input.paymentOption;
  if (input.calculationType !== undefined) row.calculation_type = input.calculationType;
  if (input.propertyPrice !== undefined) row.property_price = input.propertyPrice;
  if (input.downPayment !== undefined) row.down_payment = input.downPayment;
  if (input.bookingFee !== undefined) row.booking_fee = input.bookingFee ?? null;
  if (input.confirmationFee !== undefined) row.confirmation_fee = input.confirmationFee ?? null;
  if (input.processingFee !== undefined) row.processing_fee = input.processingFee ?? null;
  if (input.additionalCharges !== undefined) row.additional_charges = input.additionalCharges ?? null;
  if (input.additionalChargesDescription !== undefined)
    row.additional_charges_description = input.additionalChargesDescription || null;
  if (input.installmentFrequency !== undefined) row.installment_frequency = input.installmentFrequency;
  if (input.duration !== undefined) row.duration = input.duration;
  if (input.installmentAmount !== undefined) row.installment_amount = input.installmentAmount ?? null;
  if (input.enabled !== undefined) row.enabled = input.enabled;
  return row;
}

export const paymentPlanService = {
  /** Public-facing: only returns an ENABLED plan (matches the RLS
   *  policy), used by the property page / calculator. */
  async getForProperty(propertyId: string): Promise<PaymentPlan | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("payment_plans").select("*").eq("property_id", propertyId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Admin-facing: returns the plan regardless of enabled state, so the
   *  edit page can show a disabled plan for re-enabling. */
  async getForPropertyAdmin(propertyId: string): Promise<PaymentPlan | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("payment_plans").select("*").eq("property_id", propertyId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(propertyId: string, input: PaymentPlanInput): Promise<PaymentPlan> {
    const supabase = await createClient();
    const row = { ...mapInputToRow(input), property_id: propertyId };
    const { data, error } = await supabase.from("payment_plans").insert(row).select("*").single();
    if (error) {
      console.error("paymentPlanService.create failed:", error);
      throw new Error("Could not create this payment plan.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<PaymentPlanInput>): Promise<PaymentPlan> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("payment_plans").update(mapInputToRow(input)).eq("id", id).select("*").single();
    if (error) {
      console.error("paymentPlanService.update failed:", error);
      throw new Error("Could not update this payment plan.");
    }
    return mapRow(data);
  },

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("payment_plans").update({ enabled }).eq("id", id);
    if (error) throw new Error("Could not update this payment plan.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("payment_plans").delete().eq("id", id);
    if (error) throw new Error("Could not delete this payment plan.");
  },

  async listScheduleItems(paymentPlanId: string): Promise<PaymentScheduleItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_schedule_items")
      .select("*")
      .eq("payment_plan_id", paymentPlanId)
      .order("installment_number", { ascending: true });
    if (error) {
      console.error("paymentPlanService.listScheduleItems failed:", error);
      return [];
    }
    return (data ?? []).map(mapScheduleRow);
  },

  /** Replaces the entire custom schedule in one go — simplest correct
   *  behavior for an admin editing a short, hand-built list rather than
   *  reconciling individual row diffs. */
  async replaceScheduleItems(paymentPlanId: string, items: PaymentScheduleItemInput[]): Promise<void> {
    const supabase = await createClient();
    const { error: deleteError } = await supabase.from("payment_schedule_items").delete().eq("payment_plan_id", paymentPlanId);
    if (deleteError) {
      console.error("paymentPlanService.replaceScheduleItems delete failed:", deleteError);
      throw new Error("Could not save the payment schedule.");
    }
    if (items.length === 0) return;
    const rows = items.map((item) => ({
      payment_plan_id: paymentPlanId,
      installment_number: item.installmentNumber,
      due_date: item.dueDate || null,
      amount: item.amount,
      description: item.description,
    }));
    const { error: insertError } = await supabase.from("payment_schedule_items").insert(rows);
    if (insertError) {
      console.error("paymentPlanService.replaceScheduleItems insert failed:", insertError);
      throw new Error("Could not save the payment schedule.");
    }
  },
};
