"use server";

import { revalidatePath } from "next/cache";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { dealDocumentService } from "@/services/dealDocumentService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";
import { canAccess, canManageDealFinancials } from "@/lib/permissions";
import type { DealInput, DealStatus, CancellationReason, PaymentType, PaymentMethod, DealDocumentType, DealDocumentStatus } from "@/lib/models/deal";

async function requireDealsAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "deals")) throw new Error("Not authorized.");
  return admin;
}

async function requireDealsFinancialAccess() {
  const admin = await requireDealsAccess();
  if (!canManageDealFinancials(admin.role)) throw new Error("Not authorized to manage financial details.");
  return admin;
}

function revalidateDeal(id: string) {
  revalidatePath(`/admin/deals/${id}`);
  revalidatePath(`/admin/deals/${id}/payments`);
  revalidatePath("/admin/deals");
  revalidatePath("/admin/deals/pipeline");
}

export async function createDealAction(input: DealInput) {
  const admin = await requireDealsAccess();
  const deal = await dealService.create(input, admin.id);
  revalidatePath("/admin/deals");
  revalidatePath("/admin/deals/pipeline");
  if (deal.leadId) revalidatePath(`/admin/crm/leads/${deal.leadId}`);
  return deal;
}

export async function updateDealFinancialsAction(
  id: string,
  input: { negotiatedPrice?: number; discountAmount?: number; discountReason?: string; bookingAmount?: number; bookingDate?: string; bookingStatus?: string }
) {
  const admin = await requireDealsFinancialAccess();
  const before = await dealService.getById(id);
  const updated = await dealService.updateFinancials(id, input);
  if (updated) {
    await activityService.log(
      input.discountAmount !== undefined && input.discountAmount !== before?.discountAmount ? "Discount Added" : "Deal Amount Changed",
      `${updated.dealNumber} financials updated by ${admin.name}`,
      "deal",
      id,
      { before: { negotiatedPrice: before?.negotiatedPrice, discountAmount: before?.discountAmount }, after: input }
    );
  }
  revalidateDeal(id);
}

export async function assignDealAgentAction(id: string, agentId: string | null, agentName: string | null) {
  const admin = await requireDealsAccess();
  const updated = await dealService.assignAgent(id, agentId);
  if (updated) {
    await activityService.log(
      "Agent Assigned",
      agentName ? `${updated.dealNumber} → ${agentName} (by ${admin.name})` : `${updated.dealNumber} unassigned by ${admin.name}`,
      "deal",
      id
    );
  }
  revalidateDeal(id);
}

export async function updateDealStatusAction(id: string, status: DealStatus, cancellationReason?: CancellationReason) {
  const admin = await requireDealsAccess();
  const before = await dealService.getById(id);
  const updated = await dealService.updateStatus(id, status, cancellationReason);
  await activityService.log(
    status === "Completed" ? "Deal Completed" : status === "Cancelled" ? "Deal Cancelled" : "Status Changed",
    `${updated.dealNumber} → ${status} by ${admin.name}${cancellationReason ? ` (${cancellationReason})` : ""}`,
    "deal",
    id,
    { from: before?.status, to: status, reason: cancellationReason }
  );
  if (updated.customerId) {
    await notificationService.notify(
      updated.customerId,
      "deal_status_updated",
      "Your deal status has been updated",
      `${updated.dealNumber}${updated.propertyTitle ? ` — ${updated.propertyTitle}` : ""} is now "${status}".`,
      "deal",
      id
    );
  }
  revalidateDeal(id);
  return updated;
}

export async function completeDealAction(id: string) {
  return updateDealStatusAction(id, "Completed");
}

export async function cancelDealAction(id: string, reason: CancellationReason) {
  return updateDealStatusAction(id, "Cancelled", reason);
}

export async function updateDealCommissionAction(id: string, input: { commissionRate?: number; commissionAmount?: number; commissionOverrideReason?: string }) {
  const admin = await requireDealsFinancialAccess();
  const updated = await dealService.updateCommission(id, input);
  if (updated) {
    await activityService.log("Commission Changed", `${updated.dealNumber} commission updated by ${admin.name}`, "deal", id, input);
  }
  revalidateDeal(id);
}

export async function approveDealCommissionAction(id: string) {
  const admin = await requireDealsFinancialAccess();
  await dealService.approveCommission(id);
  await activityService.log("Commission Approved", `Approved by ${admin.name}`, "deal", id);
  revalidateDeal(id);
}

export async function markDealCommissionPaidAction(id: string, amount: number) {
  const admin = await requireDealsFinancialAccess();
  await dealService.markCommissionPaid(id, amount);
  await activityService.log("Commission Paid", `${admin.name} recorded a commission payment of PKR ${amount.toLocaleString("en-PK")}`, "deal", id, { amount });
  revalidateDeal(id);
}

export async function addDealNoteAction(dealId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return;
  const admin = await requireDealsAccess();
  await dealService.addNote(dealId, trimmed, admin.name, admin.id);
  revalidateDeal(dealId);
}

export async function recordDealPaymentAction(
  dealId: string,
  input: { amount: number; paymentType: PaymentType; paymentMethod: PaymentMethod; reference?: string; paymentDate: string; notes?: string; scheduleItemId?: string }
) {
  const admin = await requireDealsAccess();
  const payment = await dealPaymentService.create(dealId, input, admin.id);
  const deal = await dealService.getById(dealId);
  await activityService.log("Payment Added", `${deal?.dealNumber ?? dealId}: ${input.paymentType} payment of PKR ${input.amount.toLocaleString("en-PK")} recorded by ${admin.name}`, "deal", dealId, {
    amount: input.amount,
    paymentType: input.paymentType,
    paymentMethod: input.paymentMethod,
  });
  revalidateDeal(dealId);
  return payment;
}

export async function verifyDealPaymentAction(paymentId: string, dealId: string) {
  const admin = await requireDealsFinancialAccess();
  await dealPaymentService.setStatus(paymentId, "Verified", admin.id);
  await activityService.log("Payment Verified", `Verified by ${admin.name}`, "deal", dealId, { paymentId });
  revalidateDeal(dealId);
}

export async function rejectDealPaymentAction(paymentId: string, dealId: string) {
  const admin = await requireDealsFinancialAccess();
  await dealPaymentService.setStatus(paymentId, "Rejected", admin.id);
  await activityService.log("Payment Rejected", `Rejected by ${admin.name}`, "deal", dealId, { paymentId });
  revalidateDeal(dealId);
}

export async function refundDealPaymentAction(paymentId: string, dealId: string, input: { amount: number; reason?: string; reference?: string }) {
  const admin = await requireDealsFinancialAccess();
  const refund = await dealPaymentService.refund(paymentId, dealId, input, admin.id);
  await activityService.log("Payment Refunded", `${admin.name} refunded PKR ${input.amount.toLocaleString("en-PK")}`, "deal", dealId, { paymentId, ...input });
  revalidateDeal(dealId);
  return refund;
}

export async function uploadDealDocumentAction(dealId: string, name: string, documentType: DealDocumentType, dataUri: string) {
  const admin = await requireDealsAccess();
  const doc = await dealDocumentService.upload(dealId, name, documentType, dataUri, admin.id);
  await activityService.log("Document Uploaded", `${admin.name} uploaded "${name}" (${documentType})`, "deal", dealId, { documentType });
  revalidateDeal(dealId);
  return doc;
}

export async function setDealDocumentStatusAction(documentId: string, dealId: string, status: DealDocumentStatus) {
  const admin = await requireDealsFinancialAccess();
  await dealDocumentService.setStatus(documentId, status);
  await activityService.log(status === "Approved" ? "Document Approved" : "Document Status Changed", `${admin.name} set status to ${status}`, "deal", dealId, { documentId, status });
  if (status === "Approved") {
    const deal = await dealService.getById(dealId);
    if (deal?.customerId) {
      await notificationService.notify(deal.customerId, "document_approved", "A document was approved", `${deal.dealNumber}: a document has been approved.`, "deal", dealId);
    }
  }
  revalidateDeal(dealId);
}

export async function removeDealDocumentAction(documentId: string, dealId: string) {
  const admin = await requireDealsAccess();
  await dealDocumentService.remove(documentId);
  await activityService.log("Document Removed", `Removed by ${admin.name}`, "deal", dealId, { documentId });
  revalidateDeal(dealId);
}

/** Manual, admin-triggered in-app notification (section 22) — there is
 *  no email/SMS/WhatsApp automation configured in this deployment, so
 *  this only ever creates a real customer_notifications row a customer
 *  will see in their portal; it never claims the message was delivered
 *  by any external channel. */
export async function sendPaymentReminderAction(dealId: string, kind: "payment_due" | "payment_overdue", message: string) {
  await requireDealsAccess();
  const deal = await dealService.getById(dealId);
  if (!deal?.customerId) throw new Error("This deal has no linked customer account to notify.");
  await notificationService.notify(deal.customerId, kind, kind === "payment_overdue" ? "Payment overdue" : "Payment reminder", message, "deal", dealId);
  await activityService.log("Payment Reminder Sent", message, "deal", dealId);
}
