"use server";

import { revalidatePath } from "next/cache";
import { legalPropertyService } from "@/services/legalPropertyService";
import { ownershipService } from "@/services/ownershipService";
import { legalDocumentService } from "@/services/legalDocumentService";
import { legalChecklistService } from "@/services/legalChecklistService";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { complianceService } from "@/services/complianceService";
import { encumbranceService } from "@/services/encumbranceService";
import { legalCaseService } from "@/services/legalCaseService";
import { legalNoticeService } from "@/services/legalNoticeService";
import { legalContractService } from "@/services/legalContractService";
import { legalApprovalService } from "@/services/legalApprovalService";
import { legalRiskService } from "@/services/legalRiskService";
import { legalSettingsService } from "@/services/legalSettingsService";
import { legalFilePdfService } from "@/services/legalFilePdfService";
import { profileService } from "@/services/profileService";
import { canAccess, canManageLegal } from "@/lib/permissions";
import type {
  LegalPropertyRecordInput,
  PropertyOwnershipRecordInput,
  OwnershipTransferInput,
  VerificationStatus,
  LegalChecklistTemplateInput,
  LegalChecklistTemplateItemInput,
  LegalChecklistResultInput,
  DueDiligenceCaseInput,
  DueDiligenceStatus,
  PropertyComplianceRecordInput,
  ComplianceStatus,
  EncumbranceInput,
  EncumbranceStatus,
  LegalCaseInput,
  LegalCaseStatus,
  LegalCaseEventInput,
  LegalNoticeInput,
  LegalContractInput,
  LegalContractStatus,
  LegalApprovalInput,
  LegalRiskInput,
  LegalRiskStatus,
  LegalSettingsInput,
  ConfidentialityLevel,
  CopyType,
} from "@/lib/models/legal";

async function requireLegalAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "legal")) throw new Error("Not authorized.");
  return admin;
}

async function requireLegalManageAccess() {
  const admin = await requireLegalAccess();
  if (!canManageLegal(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

/** A due-diligence/legal case's assigned officer may act on their own
 *  case even if they aren't admin/manager tier — mirrors construction's
 *  site_manager_id-scoped update precedent. Anyone with manage access
 *  may always act. */
async function requireCaseAccess(caseLegalOfficerId?: string) {
  const admin = await requireLegalAccess();
  if (canManageLegal(admin.role)) return admin;
  if (caseLegalOfficerId && caseLegalOfficerId === admin.id) return admin;
  throw new Error("Not authorized for this action.");
}

function revalidateLegal() {
  revalidatePath("/admin/legal");
  revalidatePath("/admin/legal/dashboard");
  revalidatePath("/admin/legal/properties");
  revalidatePath("/admin/legal/ownership");
  revalidatePath("/admin/legal/documents");
  revalidatePath("/admin/legal/verification");
  revalidatePath("/admin/legal/compliance");
  revalidatePath("/admin/legal/approvals");
  revalidatePath("/admin/legal/cases");
  revalidatePath("/admin/legal/notices");
  revalidatePath("/admin/legal/contracts");
  revalidatePath("/admin/legal/due-diligence");
  revalidatePath("/admin/legal/risks");
  revalidatePath("/admin/legal/events");
  revalidatePath("/admin/legal/reports");
  revalidatePath("/admin/legal/settings");
  revalidatePath("/customer/legal");
}

// ---- Legal property records ----
export async function assignLegalOfficerAction(propertyId: string, legalOfficerId: string | null) {
  const admin = await requireLegalManageAccess();
  await legalPropertyService.assignOfficer(propertyId, legalOfficerId, admin.id, admin.name);
  revalidateLegal();
}
export async function updateLegalPropertyNotesAction(propertyId: string, internalNotes: string) {
  await requireLegalManageAccess();
  await legalPropertyService.updateNotes(propertyId, internalNotes);
  revalidateLegal();
}
export type { LegalPropertyRecordInput };

// ---- Ownership ----
export async function createOwnershipRecordAction(input: PropertyOwnershipRecordInput) {
  const admin = await requireLegalManageAccess();
  const record = await ownershipService.create(input, admin.id, admin.name);
  revalidateLegal();
  return record;
}
export async function updateOwnershipRecordAction(id: string, input: Partial<PropertyOwnershipRecordInput>) {
  await requireLegalManageAccess();
  await ownershipService.update(id, input);
  revalidateLegal();
}
export async function setOwnershipVerificationAction(id: string, status: VerificationStatus) {
  const admin = await requireLegalManageAccess();
  await ownershipService.setVerification(id, status, admin.id, admin.name);
  revalidateLegal();
}
export async function setOwnershipStatusAction(id: string, status: "ACTIVE" | "TRANSFERRED" | "DISPUTED" | "ARCHIVED") {
  const admin = await requireLegalManageAccess();
  await ownershipService.setStatus(id, status, admin.id, admin.name);
  revalidateLegal();
}
export async function recordOwnershipTransferAction(input: OwnershipTransferInput) {
  const admin = await requireLegalManageAccess();
  const transfer = await ownershipService.recordTransfer(input, admin.id, admin.name);
  revalidateLegal();
  return transfer;
}

// ---- Legal documents ----
export async function uploadLegalDocumentAction(input: {
  title: string;
  documentType: string;
  dataUri: string;
  fileName: string;
  propertyId?: string;
  projectId?: string;
  ownershipRecordId?: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  expiresAt?: string;
  confidentialityLevel?: ConfidentialityLevel;
  copyType?: CopyType;
}) {
  const admin = await requireLegalManageAccess();
  const doc = await legalDocumentService.uploadLegalDocument(input, { adminId: admin.id, name: admin.name });
  revalidateLegal();
  return doc;
}
export async function updateLegalDocumentClassificationAction(id: string, input: Parameters<typeof legalDocumentService.updateClassification>[1]) {
  await requireLegalManageAccess();
  await legalDocumentService.updateClassification(id, input);
  revalidateLegal();
}
export async function submitLegalDocumentForReviewAction(documentId: string) {
  const admin = await requireLegalManageAccess();
  await legalDocumentService.submitForReview(documentId, { adminId: admin.id, name: admin.name });
  revalidateLegal();
}
export async function verifyLegalDocumentAction(documentId: string) {
  const admin = await requireLegalManageAccess();
  await legalDocumentService.verify(documentId, { adminId: admin.id, name: admin.name });
  revalidateLegal();
}
export async function rejectLegalDocumentAction(documentId: string, reason: string) {
  const admin = await requireLegalManageAccess();
  await legalDocumentService.reject(documentId, reason, { adminId: admin.id, name: admin.name });
  revalidateLegal();
}

// ---- Checklist templates ----
export async function createChecklistTemplateAction(input: LegalChecklistTemplateInput) {
  const admin = await requireLegalManageAccess();
  const template = await legalChecklistService.createTemplate(input, admin.id);
  revalidateLegal();
  return template;
}
export async function updateChecklistTemplateAction(id: string, input: Partial<LegalChecklistTemplateInput>) {
  await requireLegalManageAccess();
  await legalChecklistService.updateTemplate(id, input);
  revalidateLegal();
}
export async function addChecklistItemAction(input: LegalChecklistTemplateItemInput) {
  await requireLegalManageAccess();
  const item = await legalChecklistService.addItem(input);
  revalidateLegal();
  return item;
}
export async function removeChecklistItemAction(id: string) {
  await requireLegalManageAccess();
  await legalChecklistService.removeItem(id);
  revalidateLegal();
}
export async function recordChecklistResultAction(input: LegalChecklistResultInput, caseLegalOfficerId?: string) {
  const admin = await requireCaseAccess(caseLegalOfficerId);
  const result = await legalChecklistService.recordResult(input, admin.id);
  revalidateLegal();
  return result;
}

// ---- Due diligence ----
export async function createDueDiligenceCaseAction(input: DueDiligenceCaseInput) {
  const admin = await requireLegalManageAccess();
  const dd = await dueDiligenceService.create(input, admin.id, admin.name);
  revalidateLegal();
  return dd;
}
export async function assignDueDiligenceOfficerAction(id: string, legalOfficerId: string | null) {
  const admin = await requireLegalManageAccess();
  await dueDiligenceService.assignOfficer(id, legalOfficerId, admin.id, admin.name);
  revalidateLegal();
}
export async function updateDueDiligenceStatusAction(id: string, status: DueDiligenceStatus, caseLegalOfficerId: string | undefined, note?: { outcomeSummary?: string; internalRiskNotes?: string }) {
  const admin = await requireCaseAccess(caseLegalOfficerId);
  const dd = await dueDiligenceService.updateStatus(id, status, admin.id, admin.name, note);
  revalidateLegal();
  return dd;
}

// ---- Compliance ----
export async function createComplianceRecordAction(input: PropertyComplianceRecordInput) {
  const admin = await requireLegalManageAccess();
  const record = await complianceService.create(input, admin.id);
  revalidateLegal();
  return record;
}
export async function updateComplianceStatusAction(id: string, status: ComplianceStatus, notes?: string, nextReviewDate?: string) {
  const admin = await requireLegalManageAccess();
  await complianceService.updateStatus(id, status, admin.id, admin.name, notes, nextReviewDate);
  revalidateLegal();
}

// ---- Encumbrances ----
export async function createEncumbranceAction(input: EncumbranceInput) {
  const admin = await requireLegalManageAccess();
  const record = await encumbranceService.create(input, admin.id, admin.name);
  revalidateLegal();
  return record;
}
export async function setEncumbranceStatusAction(id: string, status: EncumbranceStatus, releasedDate?: string) {
  const admin = await requireLegalManageAccess();
  await encumbranceService.setStatus(id, status, admin.id, admin.name, releasedDate);
  revalidateLegal();
}
export async function setEncumbranceVerificationAction(id: string, status: VerificationStatus) {
  const admin = await requireLegalManageAccess();
  await encumbranceService.setVerification(id, status, admin.id, admin.name);
  revalidateLegal();
}

// ---- Legal cases ----
export async function createLegalCaseAction(input: LegalCaseInput) {
  const admin = await requireLegalManageAccess();
  const legalCase = await legalCaseService.create(input, admin.id, admin.name);
  revalidateLegal();
  return legalCase;
}
export async function updateLegalCaseAction(
  id: string,
  input: { status?: LegalCaseStatus; nextHearingDate?: string; outcomeSummary?: string; notes?: string; legalOfficerId?: string | null },
  caseLegalOfficerId?: string
) {
  const admin = await requireCaseAccess(caseLegalOfficerId);
  await legalCaseService.update(id, input, admin.id, admin.name);
  revalidateLegal();
}
export async function addLegalCaseEventAction(input: LegalCaseEventInput, caseLegalOfficerId?: string) {
  const admin = await requireCaseAccess(caseLegalOfficerId);
  const event = await legalCaseService.addEvent(input, admin.id);
  revalidateLegal();
  return event;
}

// ---- Legal notices ----
export async function createLegalNoticeDraftAction(input: LegalNoticeInput) {
  const admin = await requireLegalManageAccess();
  const notice = await legalNoticeService.createDraft(input, admin.id);
  revalidateLegal();
  return notice;
}
export async function sendLegalNoticeViaCommunicationCenterAction(id: string) {
  const admin = await requireLegalManageAccess();
  const notice = await legalNoticeService.sendViaCommunicationCenter(id, { adminId: admin.id, name: admin.name });
  revalidateLegal();
  return notice;
}
export async function recordManualNoticeSendAction(id: string, sentVia: "EMAIL" | "SMS" | "POST" | "HAND_DELIVERY" | "OTHER") {
  const admin = await requireLegalManageAccess();
  const notice = await legalNoticeService.recordManualSend(id, sentVia, { adminId: admin.id, name: admin.name });
  revalidateLegal();
  return notice;
}
export async function confirmManualNoticeDeliveryAction(id: string) {
  const admin = await requireLegalManageAccess();
  await legalNoticeService.confirmManualDelivery(id, { adminId: admin.id, name: admin.name });
  revalidateLegal();
}
export async function markLegalNoticeRespondedAction(id: string) {
  const admin = await requireLegalManageAccess();
  await legalNoticeService.markResponded(id, admin.id, admin.name);
  revalidateLegal();
}
export async function cancelLegalNoticeAction(id: string) {
  const admin = await requireLegalManageAccess();
  await legalNoticeService.cancel(id, admin.id, admin.name);
  revalidateLegal();
}

// ---- Legal contracts ----
export async function createLegalContractAction(input: LegalContractInput) {
  const admin = await requireLegalManageAccess();
  const contract = await legalContractService.create(input, admin.id, admin.name);
  revalidateLegal();
  return contract;
}
export async function updateLegalContractStatusAction(id: string, status: LegalContractStatus) {
  const admin = await requireLegalManageAccess();
  const contract = await legalContractService.updateStatus(id, status, admin.id, admin.name);
  revalidateLegal();
  return contract;
}
export async function supersedeLegalContractAction(oldContractId: string, input: Omit<LegalContractInput, "supersedesContractId">) {
  const admin = await requireLegalManageAccess();
  const contract = await legalContractService.supersede(oldContractId, input, admin.id, admin.name);
  revalidateLegal();
  return contract;
}

// ---- Legal approvals ----
export async function requestLegalApprovalAction(input: LegalApprovalInput) {
  const admin = await requireLegalManageAccess();
  const approval = await legalApprovalService.request(input, admin.id);
  revalidateLegal();
  return approval;
}
export async function decideLegalApprovalAction(id: string, status: "APPROVED" | "REJECTED", comments?: string) {
  const admin = await requireLegalManageAccess();
  await legalApprovalService.decide(id, status, admin.id, admin.name, comments);
  revalidateLegal();
}

// ---- Legal risks ----
export async function flagLegalRiskAction(input: LegalRiskInput) {
  const admin = await requireLegalManageAccess();
  const risk = await legalRiskService.flag(input, admin.id, admin.name);
  revalidateLegal();
  return risk;
}
export async function updateLegalRiskStatusAction(id: string, status: LegalRiskStatus, resolutionNotes?: string) {
  const admin = await requireLegalManageAccess();
  await legalRiskService.updateStatus(id, status, admin.id, admin.name, resolutionNotes);
  revalidateLegal();
}

// ---- Property Legal File PDF ----
export async function generatePropertyLegalFileAction(propertyId: string) {
  const admin = await requireLegalManageAccess();
  const doc = await legalFilePdfService.generate(propertyId, { adminId: admin.id, name: admin.name });
  revalidateLegal();
  return doc;
}

// ---- Settings ----
export async function updateLegalSettingsAction(input: LegalSettingsInput) {
  await requireLegalManageAccess();
  await legalSettingsService.update(input);
  revalidateLegal();
}
