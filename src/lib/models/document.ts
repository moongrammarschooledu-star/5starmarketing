export type DocumentStatus = "DRAFT" | "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "APPROVED" | "REJECTED" | "EXPIRED" | "ARCHIVED" | "SUPERSEDED";

export type DocumentVisibility = "ADMIN_ONLY" | "AGENT_ONLY" | "CUSTOMER_ONLY" | "ADMIN_AGENT" | "ADMIN_CUSTOMER" | "ALL_AUTHORIZED";

export const documentStatuses: DocumentStatus[] = ["DRAFT", "UPLOADED", "UNDER_REVIEW", "VERIFIED", "APPROVED", "REJECTED", "EXPIRED", "ARCHIVED", "SUPERSEDED"];
export const documentVisibilities: DocumentVisibility[] = ["ADMIN_ONLY", "AGENT_ONLY", "CUSTOMER_ONLY", "ADMIN_AGENT", "ADMIN_CUSTOMER", "ALL_AUTHORIZED"];

/** The default checklist an admin sees when the document_types table is
 *  still empty of admin-added extras — the real, seeded types (section
 *  4). Admins can add more later; this list is not exhaustive by
 *  design, it just seeds sensible defaults. */
export const SEED_DOCUMENT_TYPE_CODES = [
  "CUSTOMER_ID",
  "ADDRESS_PROOF",
  "BOOKING_FORM",
  "BOOKING_RECEIPT",
  "SALE_AGREEMENT",
  "RENTAL_AGREEMENT",
  "PROPERTY_AGREEMENT",
  "PAYMENT_RECEIPT",
  "INSTALLMENT_RECEIPT",
  "PAYMENT_PLAN",
  "PROPERTY_FILE",
  "PROPERTY_TITLE_DOCUMENT",
  "PROJECT_DOCUMENT",
  "ALLOTMENT_LETTER",
  "POSSESSION_LETTER",
  "TRANSFER_DOCUMENT",
  "NOC",
  "TAX_DOCUMENT",
  "BANK_DOCUMENT",
  "CUSTOMER_REQUEST",
  "OTHER",
] as const;

/** Validated pipeline (section 7) — mirrors the deals/inventory named-
 *  transition pattern. Rejected documents may only go back to UPLOADED
 *  (re-submission), never straight to APPROVED. */
export const DOCUMENT_ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  DRAFT: ["UPLOADED", "ARCHIVED"],
  UPLOADED: ["UNDER_REVIEW", "VERIFIED", "REJECTED", "ARCHIVED"],
  UNDER_REVIEW: ["VERIFIED", "APPROVED", "REJECTED", "ARCHIVED"],
  VERIFIED: ["APPROVED", "REJECTED", "ARCHIVED"],
  APPROVED: ["ARCHIVED", "SUPERSEDED", "EXPIRED"],
  REJECTED: ["UPLOADED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED", "UPLOADED"],
  ARCHIVED: ["UPLOADED"],
  SUPERSEDED: ["ARCHIVED"],
};

export interface DocumentType {
  code: string;
  label: string;
  category: string;
  requiresExpiry: boolean;
  active: boolean;
  sortOrder: number;
}

export interface DocumentRecord {
  id: string;
  documentNumber: string;
  title: string;
  documentType: string;
  category?: string;
  description?: string;
  customerId?: string;
  leadId?: string;
  propertyId?: string;
  projectId?: string;
  dealId?: string;
  paymentId?: string;
  installmentId?: string;
  templateId?: string;
  uploadedBy?: string;
  uploadedByCustomer: boolean;
  verifiedBy?: string;
  approvedBy?: string;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string;
  currentVersion: number;
  rejectionReason?: string;
  expiresAt?: string;
  verifiedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Joined, display-only fields.
  documentTypeLabel?: string;
  customerName?: string;
  propertyTitle?: string;
  projectName?: string;
  dealNumber?: string;
  uploadedByName?: string;
  verifiedByName?: string;
  approvedByName?: string;
}

export interface DocumentInput {
  title: string;
  documentType: string;
  category?: string;
  description?: string;
  customerId?: string;
  leadId?: string;
  propertyId?: string;
  projectId?: string;
  dealId?: string;
  paymentId?: string;
  installmentId?: string;
  templateId?: string;
  visibility?: DocumentVisibility;
  expiresAt?: string;
  fileName: string;
  dataUri: string;
}

export interface DocumentVersionEntry {
  id: string;
  documentId: string;
  versionNumber: number;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedByCustomer: boolean;
  reason?: string;
  createdAt: string;
}

export interface DocumentAuditEntry {
  id: string;
  documentId: string;
  actorId?: string;
  actorName?: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: string;
  content: string;
  version: number;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentTemplateInput = Pick<DocumentTemplate, "name" | "documentType" | "content"> & { active?: boolean };

export const TEMPLATE_VARIABLES = [
  "{{customer_name}}",
  "{{customer_phone}}",
  "{{customer_email}}",
  "{{property_title}}",
  "{{property_type}}",
  "{{property_location}}",
  "{{property_size}}",
  "{{project_name}}",
  "{{deal_number}}",
  "{{deal_amount}}",
  "{{booking_amount}}",
  "{{payment_received}}",
  "{{outstanding_amount}}",
  "{{agent_name}}",
  "{{agent_phone}}",
  "{{date}}",
] as const;

export interface DocumentChecklist {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChecklistItem {
  id: string;
  checklistId: string;
  documentType: string;
  required: boolean;
  description?: string;
  sortOrder: number;
  applicablePropertyType?: string;
  applicableDealType?: string;
  active: boolean;

  // Joined, display-only.
  documentTypeLabel?: string;
  checklistName?: string;
}

export type DocumentChecklistItemInput = Omit<DocumentChecklistItem, "id" | "documentTypeLabel" | "checklistName">;

export interface DealChecklistProgress {
  totalRequired: number;
  completedRequired: number;
  percent: number;
  items: {
    item: DocumentChecklistItem;
    document?: DocumentRecord;
  }[];
}

// ---------------------------------------------------------------------
// Signatures (sections 20-31, 67)
// ---------------------------------------------------------------------
export type SignatureStatus = "Pending" | "Completed" | "Expired" | "Cancelled";
export type SigningOrderMode = "Sequential" | "Parallel";
export type ParticipantType = "Customer" | "Seller" | "Agent" | "Admin" | "Other";
export type ParticipantStatus = "Pending" | "Signed" | "Declined";
export type SignatureMethod = "Typed" | "Drawn" | "Uploaded";

export const participantTypes: ParticipantType[] = ["Customer", "Seller", "Agent", "Admin", "Other"];

export interface DocumentSignatureRequest {
  id: string;
  documentId: string;
  documentVersion: number;
  status: SignatureStatus;
  signingOrderMode: SigningOrderMode;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;

  documentTitle?: string;
  documentNumber?: string;
}

export interface SignatureParticipant {
  id: string;
  signatureId: string;
  participantType: ParticipantType;
  participantName: string;
  participantEmail?: string;
  customerId?: string;
  adminId?: string;
  signOrder: number;
  status: ParticipantStatus;
  signedAt?: string;
  signatureMethod?: SignatureMethod;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SignatureParticipantInput {
  participantType: ParticipantType;
  participantName: string;
  participantEmail?: string;
  customerId?: string;
  adminId?: string;
  signOrder: number;
}

// ---------------------------------------------------------------------
// Search (section 21)
// ---------------------------------------------------------------------
export const DEFAULT_DOCUMENT_PAGE_SIZE = 20;
export const MAX_DOCUMENT_PAGE_SIZE = 100;

export interface DocumentSearchFilters {
  q?: string;
  status?: DocumentStatus;
  documentType?: string;
  customerId?: string;
  propertyId?: string;
  projectId?: string;
  dealId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  expiringOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface DocumentSearchResult {
  documents: DocumentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentDashboardStats {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  expired: number;
  uploadedThisMonth: number;
}
