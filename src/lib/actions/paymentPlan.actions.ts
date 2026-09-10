"use server";

import { revalidatePath } from "next/cache";
import { paymentPlanService } from "@/services/paymentPlanService";
import { activityService } from "@/services/activityService";
import type { PaymentPlanInput, PaymentScheduleItemInput, PlanPaymentOption, CalculationType, InstallmentFrequency } from "@/lib/models/paymentPlan";

export interface PaymentPlanFormState {
  error?: string;
  success?: boolean;
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? Number(raw) : undefined;
}

function buildInput(formData: FormData): PaymentPlanInput {
  return {
    paymentOption: String(formData.get("paymentOption")) as PlanPaymentOption,
    calculationType: String(formData.get("calculationType")) as CalculationType,
    propertyPrice: Number(formData.get("propertyPrice")) || 0,
    downPayment: Number(formData.get("downPayment")) || 0,
    bookingFee: numberOrUndefined(formData.get("bookingFee")),
    confirmationFee: numberOrUndefined(formData.get("confirmationFee")),
    processingFee: numberOrUndefined(formData.get("processingFee")),
    additionalCharges: numberOrUndefined(formData.get("additionalCharges")),
    additionalChargesDescription: String(formData.get("additionalChargesDescription") ?? "").trim() || undefined,
    installmentFrequency: String(formData.get("installmentFrequency")) as InstallmentFrequency,
    duration: Number(formData.get("duration")) || 1,
    installmentAmount: numberOrUndefined(formData.get("installmentAmount")),
    enabled: formData.get("enabled") === "on",
  };
}

function revalidateAll(propertyId: string, slug?: string) {
  revalidatePath(`/admin/properties/${propertyId}/edit`);
  if (slug) {
    revalidatePath(`/properties/${slug}`);
    revalidatePath(`/calculator`);
  }
}

export async function savePaymentPlanAction(
  propertyId: string,
  propertySlug: string,
  existingPlanId: string | undefined,
  _prevState: PaymentPlanFormState,
  formData: FormData
): Promise<PaymentPlanFormState> {
  const input = buildInput(formData);
  if (!(input.propertyPrice > 0)) return { error: "Property price must be greater than zero." };
  if (input.downPayment < 0 || input.downPayment > input.propertyPrice) {
    return { error: "Down payment must be between 0 and the property price." };
  }
  if (!(input.duration > 0)) return { error: "Duration must be greater than zero." };

  try {
    if (existingPlanId) {
      await paymentPlanService.update(existingPlanId, input);
      await activityService.log("Updated Payment Plan", propertySlug, "payment_plan", existingPlanId);
    } else {
      const created = await paymentPlanService.create(propertyId, input);
      await activityService.log("Created Payment Plan", propertySlug, "payment_plan", created.id);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this payment plan." };
  }

  revalidateAll(propertyId, propertySlug);
  return { success: true };
}

export async function toggleplanEnabledAction(id: string, enabled: boolean, propertyId: string, propertySlug: string) {
  await paymentPlanService.setEnabled(id, enabled);
  await activityService.log(enabled ? "Enabled Payment Plan" : "Disabled Payment Plan", propertySlug, "payment_plan", id);
  revalidateAll(propertyId, propertySlug);
}

export async function deletePaymentPlanAction(id: string, propertyId: string, propertySlug: string) {
  await paymentPlanService.remove(id);
  await activityService.log("Deleted Payment Plan", propertySlug, "payment_plan", id);
  revalidateAll(propertyId, propertySlug);
}

export async function saveScheduleItemsAction(
  paymentPlanId: string,
  propertyId: string,
  propertySlug: string,
  items: PaymentScheduleItemInput[]
) {
  await paymentPlanService.replaceScheduleItems(paymentPlanId, items);
  revalidateAll(propertyId, propertySlug);
}
