"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { documentService } from "@/services/documentService";
import { documentTemplateService } from "@/services/documentTemplateService";
import { documentChecklistService } from "@/services/documentChecklistService";
import { documentSignatureService } from "@/services/documentSignatureService";
import { documentPdfService } from "@/services/documentPdfService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { notifyDocumentApproved, notifyDocumentRejected, notifySignatureRequired, notifySignatureCompleted } from "@/lib/documentNotifications";
import { canAccess, canManageDealFinancials } from "@/lib/permissions";
import type { DocumentInput, DocumentVisibility, DocumentTemplateInput, DocumentChecklistItemInput, SignatureParticipantInput, SigningOrderMode, SignatureMethod } from "@/lib/models/document";

async function requireDocumentsAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "documents")) throw new Error("Not authorized.");
  return admin;
}

async function requireDocumentsFinancialAccess() {
  const admin = await requireDocumentsAccess();
  if (!canManageDealFinancials(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

async function requireCustomer() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not signed in.");
  return customer;
}

async function requestMeta() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined, userAgent: h.get("user-agent") || undefined };
}

function revalidateDocument(id: string, dealId?: string) {
  revalidatePath(`/admin/documents/${id}`);
  revalidatePath("/admin/documents");
  revalidatePath(`/customer/documents/${id}`);
  revalidatePath("/customer/documents");
  if (dealId) {
    revalidatePath(`/admin/deals/${dealId}/documents`);
    revalidatePath(`/admin/deals/${dealId}`);
    revalidatePath(`/customer/deals/${dealId}`);
  }
}

// ---- Admin upload / lifecycle ----

export async function uploadDocumentAction(input: DocumentInput) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.upload(input, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

export async function replaceDocumentAction(documentId: string, input: { dataUri: string; fileName: string; reason?: string }) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.replace(documentId, input, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

export async function submitDocumentForReviewAction(documentId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.submitForReview(documentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
}

export async function verifyDocumentAction(documentId: string) {
  const admin = await requireDocumentsFinancialAccess();
  const doc = await documentService.markVerified(documentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
}

export async function approveDocumentAction(documentId: string) {
  const admin = await requireDocumentsFinancialAccess();
  const doc = await documentService.approve(documentId, { adminId: admin.id, name: admin.name });
  if (doc.customerId) {
    await notifyDocumentApproved(doc.customerId, doc.title, doc.id).catch(() => {});
  }
  revalidateDocument(doc.id, doc.dealId);
}

export async function rejectDocumentAction(documentId: string, reason: string) {
  const admin = await requireDocumentsFinancialAccess();
  const doc = await documentService.reject(documentId, reason, { adminId: admin.id, name: admin.name });
  if (doc.customerId) {
    await notifyDocumentRejected(doc.customerId, doc.title, reason, doc.id).catch(() => {});
  }
  revalidateDocument(doc.id, doc.dealId);
}

export async function archiveDocumentAction(documentId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.archive(documentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
}

export async function markDocumentExpiredAction(documentId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.markExpired(documentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
}

export async function restoreDocumentAction(documentId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentService.restore(documentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
}

export async function removeDocumentAction(documentId: string) {
  const admin = await requireDocumentsFinancialAccess();
  const doc = await documentService.getById(documentId);
  await documentService.remove(documentId, { adminId: admin.id, name: admin.name });
  revalidatePath("/admin/documents");
  if (doc?.dealId) revalidatePath(`/admin/deals/${doc.dealId}/documents`);
}

export async function getDocumentSignedUrlAction(documentId: string, kind: "Viewed" | "Downloaded") {
  const admin = await profileService.getCurrentAdmin();
  if (admin) {
    if (!canAccess(admin.role, "documents")) throw new Error("Not authorized.");
    return documentService.getSignedUrl(documentId, kind, { adminId: admin.id, name: admin.name });
  }
  const customer = await customerService.getCurrentCustomer();
  if (customer) {
    return documentService.getSignedUrl(documentId, kind, { customerId: customer.id, name: customer.fullName });
  }
  throw new Error("Not signed in.");
}

// ---- Customer upload ----

export async function customerUploadDocumentAction(input: Omit<DocumentInput, "customerId" | "visibility">) {
  const customer = await requireCustomer();
  const doc = await documentService.upload({ ...input, customerId: customer.id, visibility: "ADMIN_CUSTOMER" as DocumentVisibility }, { customerId: customer.id, name: customer.fullName });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

export async function customerReplaceDocumentAction(documentId: string, input: { dataUri: string; fileName: string }) {
  const customer = await requireCustomer();
  const doc = await documentService.replace(documentId, { ...input, reason: "Re-submitted by customer" }, { customerId: customer.id, name: customer.fullName });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

// ---- Document types ----

export async function createDocumentTypeAction(input: { code: string; label: string; category: string; requiresExpiry?: boolean }) {
  await requireDocumentsFinancialAccess();
  const type = await documentService.createType(input);
  revalidatePath("/admin/documents");
  return type;
}

export async function setDocumentTypeActiveAction(code: string, active: boolean) {
  await requireDocumentsFinancialAccess();
  await documentService.setTypeActive(code, active);
  revalidatePath("/admin/documents");
}

// ---- Templates ----

export async function createDocumentTemplateAction(input: DocumentTemplateInput) {
  const admin = await requireDocumentsFinancialAccess();
  const template = await documentTemplateService.create(input, admin.id);
  revalidatePath("/admin/documents/templates");
  return template;
}

export async function updateDocumentTemplateAction(id: string, input: Partial<DocumentTemplateInput>) {
  const admin = await requireDocumentsFinancialAccess();
  await documentTemplateService.update(id, input, admin.id);
  revalidatePath("/admin/documents/templates");
}

export async function duplicateDocumentTemplateAction(id: string) {
  const admin = await requireDocumentsFinancialAccess();
  const template = await documentTemplateService.duplicate(id, admin.id);
  revalidatePath("/admin/documents/templates");
  return template;
}

export async function setDocumentTemplateActiveAction(id: string, active: boolean) {
  await requireDocumentsFinancialAccess();
  await documentTemplateService.setActive(id, active);
  revalidatePath("/admin/documents/templates");
}

// ---- Checklists ----

export async function createChecklistAction(input: { name: string; description?: string }) {
  await requireDocumentsFinancialAccess();
  const checklist = await documentChecklistService.create(input);
  revalidatePath("/admin/documents/checklists");
  return checklist;
}

export async function updateChecklistAction(id: string, input: { name?: string; description?: string; active?: boolean }) {
  await requireDocumentsFinancialAccess();
  await documentChecklistService.update(id, input);
  revalidatePath("/admin/documents/checklists");
}

export async function removeChecklistAction(id: string) {
  await requireDocumentsFinancialAccess();
  await documentChecklistService.remove(id);
  revalidatePath("/admin/documents/checklists");
}

export async function addChecklistItemAction(input: DocumentChecklistItemInput) {
  await requireDocumentsFinancialAccess();
  const item = await documentChecklistService.addItem(input);
  revalidatePath("/admin/documents/checklists");
  return item;
}

export async function updateChecklistItemAction(id: string, input: Partial<DocumentChecklistItemInput>) {
  await requireDocumentsFinancialAccess();
  await documentChecklistService.updateItem(id, input);
  revalidatePath("/admin/documents/checklists");
}

export async function removeChecklistItemAction(id: string) {
  await requireDocumentsFinancialAccess();
  await documentChecklistService.removeItem(id);
  revalidatePath("/admin/documents/checklists");
}

// ---- Generation ----

export async function generateBookingFormAction(dealId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentPdfService.generateBookingForm(dealId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

export async function generateAgreementAction(templateId: string, dealId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentPdfService.generateFromTemplate(templateId, dealId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

export async function generatePaymentReceiptAction(paymentId: string) {
  const admin = await requireDocumentsAccess();
  const doc = await documentPdfService.generatePaymentReceipt(paymentId, { adminId: admin.id, name: admin.name });
  revalidateDocument(doc.id, doc.dealId);
  return doc;
}

// ---- Signatures ----

export async function createSignatureRequestAction(documentId: string, documentVersion: number, participants: SignatureParticipantInput[], options: { signingOrderMode?: SigningOrderMode; expiresInDays?: number }) {
  const admin = await requireDocumentsAccess();
  const request = await documentSignatureService.createRequest(documentId, documentVersion, participants, options, admin.id);
  for (const p of participants) {
    if (p.customerId) {
      await notifySignatureRequired(p.customerId, request.documentTitle ?? "a document", documentId).catch(() => {});
    }
  }
  revalidateDocument(documentId);
  return request;
}

export async function signParticipantAction(participantId: string, method: SignatureMethod, data: string) {
  const customer = await requireCustomer();
  const { ip, userAgent } = await requestMeta();
  const participant = await documentSignatureService.sign(participantId, { method, data, ipAddress: ip, userAgent });
  const request = await documentSignatureService.getById(participant.signatureId);
  if (request?.status === "Completed") {
    const allParticipants = await documentSignatureService.listParticipants(participant.signatureId);
    for (const p of allParticipants) {
      if (p.customerId) {
        await notifySignatureCompleted(p.customerId, request.documentTitle ?? "a document", request.documentId).catch(() => {});
      }
    }
  }
  revalidatePath("/customer/documents");
  return { customerId: customer.id, participant };
}

export async function declineParticipantAction(participantId: string, reason?: string) {
  await requireCustomer();
  await documentSignatureService.decline(participantId, reason);
  revalidatePath("/customer/documents");
}

export async function cancelSignatureRequestAction(signatureId: string, documentId: string) {
  await requireDocumentsAccess();
  await documentSignatureService.cancelRequest(signatureId);
  revalidateDocument(documentId);
}
