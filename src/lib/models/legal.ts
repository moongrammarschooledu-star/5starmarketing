// ---------------------------------------------------------------------
// STEP 28 — Legal, Compliance & Property Due-Diligence models.
//
// Nothing here is a substitute for a licensed lawyer/solicitor/notary
// or a government authority. Every status is either ACTUAL/VERIFIED
// (a real recorded fact), UNVERIFIED/PENDING (recorded but not yet
// confirmed), or REQUIRES_PROFESSIONAL_REVIEW — never a computer-
// guessed legal conclusion.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// legal_property_records (sections 2-3)
// ---------------------------------------------------------------------
export interface LegalPropertyRecord {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  legalOfficerId?: string;
  legalOfficerName?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalPropertyRecordInput = {
  propertyId: string;
  legalOfficerId?: string;
  internalNotes?: string;
};

// ---------------------------------------------------------------------
// property_ownership_records (sections 4-5)
// ---------------------------------------------------------------------
export type OwnerType = "INDIVIDUAL" | "COMPANY" | "GOVERNMENT" | "TRUST" | "OTHER";
export const ownerTypes: OwnerType[] = ["INDIVIDUAL", "COMPANY", "GOVERNMENT", "TRUST", "OTHER"];

export type OwnershipType = "FREEHOLD" | "LEASEHOLD" | "ALLOTMENT" | "OTHER";
export const ownershipTypes: OwnershipType[] = ["FREEHOLD", "LEASEHOLD", "ALLOTMENT", "OTHER"];

export type AcquisitionMethod = "PURCHASE" | "INHERITANCE" | "GIFT" | "COURT_ORDER" | "OTHER";
export const acquisitionMethods: AcquisitionMethod[] = ["PURCHASE", "INHERITANCE", "GIFT", "COURT_ORDER", "OTHER"];

export type OwnershipRecordStatus = "ACTIVE" | "TRANSFERRED" | "DISPUTED" | "ARCHIVED";
export const ownershipRecordStatuses: OwnershipRecordStatus[] = ["ACTIVE", "TRANSFERRED", "DISPUTED", "ARCHIVED"];

export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "REQUIRES_REVIEW";
export const verificationStatuses: VerificationStatus[] = ["UNVERIFIED", "VERIFIED", "REQUIRES_REVIEW"];

export interface PropertyOwnershipRecord {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  ownerType: OwnerType;
  ownerName: string;
  ownerIdentityNumber?: string;
  ownershipSharePercent: number;
  ownershipType: OwnershipType;
  acquisitionMethod?: AcquisitionMethod;
  acquiredDate?: string;
  sourceDocumentId?: string;
  status: OwnershipRecordStatus;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyOwnershipRecordInput = {
  propertyId: string;
  ownerType?: OwnerType;
  ownerName: string;
  ownerIdentityNumber?: string;
  ownershipSharePercent: number;
  ownershipType?: OwnershipType;
  acquisitionMethod?: AcquisitionMethod;
  acquiredDate?: string;
  sourceDocumentId?: string;
  notes?: string;
};

/** Never guess a missing remainder — this is a display-only summary of
 *  what has actually been recorded. */
export interface OwnershipAllocationSummary {
  propertyId: string;
  totalActiveSharePercent: number;
  allocationComplete: boolean;
  records: PropertyOwnershipRecord[];
}

// ---------------------------------------------------------------------
// ownership_transfers (section 6) — append-only history
// ---------------------------------------------------------------------
export type TransferType = "SALE" | "INHERITANCE" | "GIFT" | "COURT_ORDER" | "OTHER";
export const transferTypes: TransferType[] = ["SALE", "INHERITANCE", "GIFT", "COURT_ORDER", "OTHER"];

export interface OwnershipTransfer {
  id: string;
  propertyId: string;
  fromOwnerRecordId?: string;
  fromOwnerName?: string;
  toOwnerName: string;
  toOwnerType: OwnerType;
  transferType: TransferType;
  sharePercentTransferred: number;
  transferDate: string;
  documentId?: string;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
}

export type OwnershipTransferInput = {
  propertyId: string;
  fromOwnerRecordId?: string;
  toOwnerName: string;
  toOwnerType?: OwnerType;
  transferType?: TransferType;
  sharePercentTransferred: number;
  transferDate: string;
  documentId?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// legal_documents (sections 7-13) — metadata companion to `documents`
// ---------------------------------------------------------------------
export type ConfidentialityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
export const confidentialityLevels: ConfidentialityLevel[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL"];

export type CopyType = "ORIGINAL" | "COPY" | "CERTIFIED_COPY" | "DIGITAL_COPY" | "UNKNOWN";
export const copyTypes: CopyType[] = ["ORIGINAL", "COPY", "CERTIFIED_COPY", "DIGITAL_COPY", "UNKNOWN"];

export interface LegalDocument {
  id: string;
  documentId: string;
  // Read-through fields from the linked `documents` row — never
  // duplicated storage, just convenience for the UI.
  documentTitle?: string;
  documentType?: string;
  documentStatus?: string;
  documentExpiresAt?: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  ownershipRecordId?: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  confidentialityLevel: ConfidentialityLevel;
  copyType: CopyType;
  reminderDaysBeforeExpiry?: number[];
  verificationNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalDocumentInput = {
  documentId: string;
  propertyId?: string;
  projectId?: string;
  ownershipRecordId?: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  confidentialityLevel?: ConfidentialityLevel;
  copyType?: CopyType;
  reminderDaysBeforeExpiry?: number[];
  verificationNotes?: string;
};

// ---------------------------------------------------------------------
// legal_checklist_templates / _template_items (sections 15, 17-18)
// ---------------------------------------------------------------------
export type ChecklistTemplateType = "DUE_DILIGENCE" | "COMPLIANCE";
export const checklistTemplateTypes: ChecklistTemplateType[] = ["DUE_DILIGENCE", "COMPLIANCE"];

export interface LegalChecklistTemplate {
  id: string;
  name: string;
  templateType: ChecklistTemplateType;
  applicablePropertyType?: string;
  applicableProjectId?: string;
  applicableProjectName?: string;
  jurisdiction?: string;
  applicableTransactionType?: string;
  active: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type LegalChecklistTemplateInput = {
  name: string;
  templateType: ChecklistTemplateType;
  applicablePropertyType?: string;
  applicableProjectId?: string;
  jurisdiction?: string;
  applicableTransactionType?: string;
  active?: boolean;
};

export interface LegalChecklistTemplateItem {
  id: string;
  templateId: string;
  itemLabel: string;
  description?: string;
  documentTypeCode?: string;
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

export type LegalChecklistTemplateItemInput = {
  templateId: string;
  itemLabel: string;
  description?: string;
  documentTypeCode?: string;
  required?: boolean;
  sortOrder?: number;
};

// ---------------------------------------------------------------------
// due_diligence_cases (sections 14, 16) — 9-state workflow
// ---------------------------------------------------------------------
export type DueDiligenceStatus =
  | "REQUESTED"
  | "IN_PROGRESS"
  | "DOCUMENTS_PENDING"
  | "UNDER_REVIEW"
  | "ISSUES_FOUND"
  | "ON_HOLD"
  | "COMPLETED"
  | "CLEARED_WITH_CONDITIONS"
  | "CANCELLED";
export const dueDiligenceStatuses: DueDiligenceStatus[] = [
  "REQUESTED",
  "IN_PROGRESS",
  "DOCUMENTS_PENDING",
  "UNDER_REVIEW",
  "ISSUES_FOUND",
  "ON_HOLD",
  "COMPLETED",
  "CLEARED_WITH_CONDITIONS",
  "CANCELLED",
];

export const DUE_DILIGENCE_ALLOWED_TRANSITIONS: Record<DueDiligenceStatus, DueDiligenceStatus[]> = {
  REQUESTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DOCUMENTS_PENDING", "UNDER_REVIEW", "ON_HOLD", "CANCELLED"],
  DOCUMENTS_PENDING: ["IN_PROGRESS", "UNDER_REVIEW", "ON_HOLD", "CANCELLED"],
  UNDER_REVIEW: ["ISSUES_FOUND", "COMPLETED", "CLEARED_WITH_CONDITIONS", "ON_HOLD", "CANCELLED"],
  ISSUES_FOUND: ["IN_PROGRESS", "ON_HOLD", "CLEARED_WITH_CONDITIONS", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "UNDER_REVIEW", "CANCELLED"],
  COMPLETED: [],
  CLEARED_WITH_CONDITIONS: [],
  CANCELLED: [],
};

export type TransactionType = "PURCHASE" | "SALE" | "RENTAL" | "MORTGAGE" | "OTHER";
export const transactionTypes: TransactionType[] = ["PURCHASE", "SALE", "RENTAL", "MORTGAGE", "OTHER"];

export interface DueDiligenceCase {
  id: string;
  caseNumber: string;
  propertyId: string;
  propertyTitle?: string;
  dealId?: string;
  dealNumber?: string;
  checklistTemplateId?: string;
  transactionType: TransactionType;
  status: DueDiligenceStatus;
  legalOfficerId?: string;
  legalOfficerName?: string;
  requestedBy?: string;
  requestedByName?: string;
  targetCompletionDate?: string;
  completedAt?: string;
  outcomeSummary?: string;
  internalRiskNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DueDiligenceCaseInput = {
  propertyId: string;
  dealId?: string;
  checklistTemplateId?: string;
  transactionType?: TransactionType;
  legalOfficerId?: string;
  targetCompletionDate?: string;
};

/** Clearly distinguishes checklist completion from legal clearance —
 *  never auto-labels 100% completion as "legally clear". */
export interface DueDiligenceCompletionScore {
  caseId: string;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  requiresReviewItems: number;
  notApplicableItems: number;
  notCheckedItems: number;
  checklistCompletionPercent: number | null;
}

// ---------------------------------------------------------------------
// property_compliance_records (section 19)
// ---------------------------------------------------------------------
export type ComplianceStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW";
export const complianceStatuses: ComplianceStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLIANT", "NON_COMPLIANT", "REQUIRES_REVIEW"];

export interface PropertyComplianceRecord {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  checklistTemplateId?: string;
  status: ComplianceStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  nextReviewDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyComplianceRecordInput = {
  propertyId: string;
  projectId?: string;
  checklistTemplateId?: string;
  nextReviewDate?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// legal_checklist_results (sections 16, 19) — shared by due-diligence
// and compliance
// ---------------------------------------------------------------------
export type ChecklistResultSubjectType = "DUE_DILIGENCE_CASE" | "COMPLIANCE_RECORD";
export type ChecklistResultStatus = "NOT_CHECKED" | "PASSED" | "FAILED" | "NOT_APPLICABLE" | "REQUIRES_REVIEW";
export const checklistResultStatuses: ChecklistResultStatus[] = ["NOT_CHECKED", "PASSED", "FAILED", "NOT_APPLICABLE", "REQUIRES_REVIEW"];

export interface LegalChecklistResult {
  id: string;
  subjectType: ChecklistResultSubjectType;
  subjectId: string;
  templateItemId: string;
  itemLabel?: string;
  itemRequired?: boolean;
  status: ChecklistResultStatus;
  evidenceDocumentId?: string;
  notes?: string;
  checkedBy?: string;
  checkedByName?: string;
  checkedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalChecklistResultInput = {
  subjectType: ChecklistResultSubjectType;
  subjectId: string;
  templateItemId: string;
  status: ChecklistResultStatus;
  evidenceDocumentId?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// encumbrances (section 20)
// ---------------------------------------------------------------------
export type EncumbranceType = "MORTGAGE" | "LIEN" | "COURT_ORDER" | "DISPUTE" | "EASEMENT" | "OTHER";
export const encumbranceTypes: EncumbranceType[] = ["MORTGAGE", "LIEN", "COURT_ORDER", "DISPUTE", "EASEMENT", "OTHER"];

export type EncumbranceStatus = "ACTIVE" | "RELEASED" | "DISPUTED" | "UNDER_REVIEW";
export const encumbranceStatuses: EncumbranceStatus[] = ["ACTIVE", "RELEASED", "DISPUTED", "UNDER_REVIEW"];

export interface Encumbrance {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  encumbranceType: EncumbranceType;
  status: EncumbranceStatus;
  holderName?: string;
  amount?: number;
  referenceNumber?: string;
  imposedDate?: string;
  releasedDate?: string;
  evidenceDocumentId?: string;
  verificationStatus: VerificationStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type EncumbranceInput = {
  propertyId: string;
  encumbranceType?: EncumbranceType;
  holderName?: string;
  amount?: number;
  referenceNumber?: string;
  imposedDate?: string;
  evidenceDocumentId?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// legal_cases (sections 21-22) — never fabricate outcomes
// ---------------------------------------------------------------------
export type LegalCaseType = "CIVIL" | "CRIMINAL" | "REVENUE" | "ARBITRATION" | "OTHER";
export const legalCaseTypes: LegalCaseType[] = ["CIVIL", "CRIMINAL", "REVENUE", "ARBITRATION", "OTHER"];

export type LegalCaseStatus = "OPEN" | "IN_PROGRESS" | "ADJOURNED" | "SETTLEMENT_DISCUSSION" | "RESOLVED" | "DISMISSED" | "CLOSED";
export const legalCaseStatuses: LegalCaseStatus[] = ["OPEN", "IN_PROGRESS", "ADJOURNED", "SETTLEMENT_DISCUSSION", "RESOLVED", "DISMISSED", "CLOSED"];

export interface LegalCase {
  id: string;
  caseNumber: string;
  propertyId?: string;
  propertyTitle?: string;
  caseType: LegalCaseType;
  title: string;
  courtOrForum?: string;
  opposingParty?: string;
  status: LegalCaseStatus;
  filedDate?: string;
  nextHearingDate?: string;
  legalOfficerId?: string;
  legalOfficerName?: string;
  outcomeSummary?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalCaseInput = {
  propertyId?: string;
  caseType?: LegalCaseType;
  title: string;
  courtOrForum?: string;
  opposingParty?: string;
  filedDate?: string;
  nextHearingDate?: string;
  legalOfficerId?: string;
};

// ---------------------------------------------------------------------
// legal_case_events (section 23)
// ---------------------------------------------------------------------
export type LegalCaseEventType = "HEARING" | "FILING" | "ORDER" | "JUDGMENT" | "NOTE" | "OTHER";
export const legalCaseEventTypes: LegalCaseEventType[] = ["HEARING", "FILING", "ORDER", "JUDGMENT", "NOTE", "OTHER"];

export interface LegalCaseEvent {
  id: string;
  caseId: string;
  eventType: LegalCaseEventType;
  eventDate: string;
  description: string;
  documentId?: string;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
}

export type LegalCaseEventInput = {
  caseId: string;
  eventType?: LegalCaseEventType;
  eventDate: string;
  description: string;
  documentId?: string;
};

// ---------------------------------------------------------------------
// legal_notices (sections 24-25)
// ---------------------------------------------------------------------
export type NoticeRecipientType = "CUSTOMER" | "TENANT" | "LANDLORD" | "THIRD_PARTY" | "GOVERNMENT" | "OTHER";
export const noticeRecipientTypes: NoticeRecipientType[] = ["CUSTOMER", "TENANT", "LANDLORD", "THIRD_PARTY", "GOVERNMENT", "OTHER"];

export type LegalNoticeType = "DEMAND" | "WARNING" | "TERMINATION" | "COMPLIANCE_ORDER" | "OTHER";
export const legalNoticeTypes: LegalNoticeType[] = ["DEMAND", "WARNING", "TERMINATION", "COMPLIANCE_ORDER", "OTHER"];

export type LegalNoticeStatus = "DRAFT" | "SENT" | "DELIVERED" | "RESPONDED" | "EXPIRED" | "CANCELLED";
export const legalNoticeStatuses: LegalNoticeStatus[] = ["DRAFT", "SENT", "DELIVERED", "RESPONDED", "EXPIRED", "CANCELLED"];

export const LEGAL_NOTICE_ALLOWED_TRANSITIONS: Record<LegalNoticeStatus, LegalNoticeStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["DELIVERED", "RESPONDED", "EXPIRED", "CANCELLED"],
  DELIVERED: ["RESPONDED", "EXPIRED"],
  RESPONDED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export type NoticeSentVia = "COMMUNICATION_CENTER" | "EMAIL" | "SMS" | "POST" | "HAND_DELIVERY" | "OTHER";
export const noticeSentViaOptions: NoticeSentVia[] = ["COMMUNICATION_CENTER", "EMAIL", "SMS", "POST", "HAND_DELIVERY", "OTHER"];

export interface LegalNotice {
  id: string;
  noticeNumber: string;
  propertyId?: string;
  propertyTitle?: string;
  caseId?: string;
  caseNumber?: string;
  recipientType: NoticeRecipientType;
  recipientCustomerId?: string;
  recipientName: string;
  noticeType: LegalNoticeType;
  subject: string;
  body: string;
  documentId?: string;
  communicationMessageId?: string;
  // Read-through from communication_messages — never a duplicated
  // stored boolean that could drift from the real send/delivery state.
  communicationMessageStatus?: string;
  sentVia?: NoticeSentVia;
  sentAt?: string;
  manualDeliveryConfirmed: boolean;
  manualDeliveryConfirmedAt?: string;
  manualDeliveryConfirmedBy?: string;
  responseDueDate?: string;
  status: LegalNoticeStatus;
  createdAt: string;
  updatedAt: string;
}

export type LegalNoticeInput = {
  propertyId?: string;
  caseId?: string;
  recipientType?: NoticeRecipientType;
  recipientCustomerId?: string;
  recipientName: string;
  noticeType?: LegalNoticeType;
  subject: string;
  body: string;
  responseDueDate?: string;
};

// ---------------------------------------------------------------------
// legal_contracts (sections 26-28)
// ---------------------------------------------------------------------
export type LegalContractType = "SALE" | "RENTAL" | "AGENCY" | "NOC" | "POWER_OF_ATTORNEY" | "OTHER";
export const legalContractTypes: LegalContractType[] = ["SALE", "RENTAL", "AGENCY", "NOC", "POWER_OF_ATTORNEY", "OTHER"];

export type LegalContractStatus = "DRAFT" | "UNDER_NEGOTIATION" | "PENDING_SIGNATURE" | "EXECUTED" | "EXPIRED" | "TERMINATED" | "SUPERSEDED";
export const legalContractStatuses: LegalContractStatus[] = ["DRAFT", "UNDER_NEGOTIATION", "PENDING_SIGNATURE", "EXECUTED", "EXPIRED", "TERMINATED", "SUPERSEDED"];

export const LEGAL_CONTRACT_ALLOWED_TRANSITIONS: Record<LegalContractStatus, LegalContractStatus[]> = {
  DRAFT: ["UNDER_NEGOTIATION", "PENDING_SIGNATURE", "TERMINATED"],
  UNDER_NEGOTIATION: ["PENDING_SIGNATURE", "TERMINATED"],
  PENDING_SIGNATURE: ["EXECUTED", "TERMINATED"],
  EXECUTED: ["EXPIRED", "TERMINATED", "SUPERSEDED"],
  EXPIRED: [],
  TERMINATED: [],
  SUPERSEDED: [],
};

export interface LegalContract {
  id: string;
  contractNumber: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  dealId?: string;
  dealNumber?: string;
  contractType: LegalContractType;
  documentId: string;
  documentTitle?: string;
  signatureId?: string;
  // Read-through from document_signatures — 'Pending' | 'Completed' |
  // 'Expired' | 'Cancelled' — reused verbatim, never re-derived.
  signatureStatus?: string;
  status: LegalContractStatus;
  effectiveDate?: string;
  expiryDate?: string;
  executedAt?: string;
  supersedesContractId?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalContractInput = {
  propertyId?: string;
  projectId?: string;
  dealId?: string;
  contractType?: LegalContractType;
  documentId: string;
  signatureId?: string;
  effectiveDate?: string;
  expiryDate?: string;
  supersedesContractId?: string;
};

// ---------------------------------------------------------------------
// legal_approvals (section 29) — polymorphic, mirrors
// construction_approvals
// ---------------------------------------------------------------------
export type LegalApprovalSubjectType = "DUE_DILIGENCE_CASE" | "LEGAL_CONTRACT" | "PROPERTY_COMPLIANCE_RECORD" | "LEGAL_CASE" | "ENCUMBRANCE" | "OTHER";
export type LegalApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export const legalApprovalStatuses: LegalApprovalStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export interface LegalApproval {
  id: string;
  subjectType: LegalApprovalSubjectType;
  subjectId: string;
  approvalStage: string;
  status: LegalApprovalStatus;
  requestedBy?: string;
  requestedByName?: string;
  approverId?: string;
  approverName?: string;
  decidedAt?: string;
  comments?: string;
  createdAt: string;
}

export type LegalApprovalInput = {
  subjectType: LegalApprovalSubjectType;
  subjectId: string;
  approvalStage?: string;
  approverId?: string;
  comments?: string;
};

// ---------------------------------------------------------------------
// legal_risks (sections 30, 34-35) — "Risk / Requires Review", never
// "illegal"
// ---------------------------------------------------------------------
export type LegalRiskSubjectType = "DUE_DILIGENCE_CASE" | "ENCUMBRANCE" | "LEGAL_CASE" | "COMPLIANCE_RECORD" | "DOCUMENT" | "OTHER";
export type LegalRiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export const legalRiskSeverities: LegalRiskSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type LegalRiskStatus = "OPEN" | "UNDER_REVIEW" | "MITIGATED" | "ACCEPTED" | "CLOSED";
export const legalRiskStatuses: LegalRiskStatus[] = ["OPEN", "UNDER_REVIEW", "MITIGATED", "ACCEPTED", "CLOSED"];

export interface LegalRisk {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  subjectType?: LegalRiskSubjectType;
  subjectId?: string;
  riskCategory: string;
  description: string;
  severity: LegalRiskSeverity;
  status: LegalRiskStatus;
  flaggedBy?: string;
  flaggedByName?: string;
  flaggedAt: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LegalRiskInput = {
  propertyId?: string;
  subjectType?: LegalRiskSubjectType;
  subjectId?: string;
  riskCategory?: string;
  description: string;
  severity?: LegalRiskSeverity;
};

/** Internal risk indicator only — never presented as a legal opinion,
 *  government clearance, or a substitute for professional review. */
export interface PropertyRiskIndicator {
  propertyId: string;
  openRisksBySeverity: Record<LegalRiskSeverity, number>;
  unverifiedDocumentsCount: number;
  activeEncumbrancesCount: number;
  ownershipAllocationComplete: boolean | null;
  openLegalCasesCount: number;
  riskIndicatorScore: number;
  disclaimer: string;
}

// ---------------------------------------------------------------------
// legal_settings (singleton)
// ---------------------------------------------------------------------
export interface LegalSettings {
  documentExpiryReminderDaysBefore: number[];
  dueDiligenceDeadlineReminderDays: number[];
  complianceReviewReminderDays: number[];
  requireLegalClearanceForDealCompletion: boolean;
  defaultConfidentialityLevel: ConfidentialityLevel;
  currency: string;
  updatedAt: string;
}

export type LegalSettingsInput = Partial<Omit<LegalSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// legal_audit_logs
// ---------------------------------------------------------------------
export interface LegalAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  reason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Dashboard / report shapes (sections 1, 32-33)
// ---------------------------------------------------------------------
export interface LegalDashboardStats {
  totalPropertiesWithLegalRecords: number;
  ownershipAllocationsIncomplete: number;
  documentsExpiringSoon: number;
  documentsExpired: number;
  documentsUnverified: number;
  openDueDiligenceCases: number;
  dueDiligenceOverdue: number;
  activeEncumbrances: number;
  openLegalCases: number;
  upcomingHearings: number;
  openLegalRisks: number;
  criticalLegalRisks: number;
  pendingLegalApprovals: number;
  nonCompliantProperties: number;
  contractsExpiringSoon: number;
}

export interface LegalCalendarEntry {
  date: string;
  type: "DUE_DILIGENCE_TARGET" | "CASE_HEARING" | "DOCUMENT_EXPIRY" | "CONTRACT_EXPIRY" | "NOTICE_RESPONSE_DUE" | "COMPLIANCE_REVIEW" | "ENCUMBRANCE_REVIEW";
  label: string;
  entityId: string;
  propertyId?: string;
}
