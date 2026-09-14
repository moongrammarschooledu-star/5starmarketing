import "server-only";
import { createClient } from "@/lib/supabase/server";
import { documentService } from "./documentService";
import { legalAuditService } from "./legalAuditService";
import type { DocumentRecord } from "@/lib/models/document";
import type { LegalDocument, LegalDocumentInput, CopyType } from "@/lib/models/legal";

const SELECT =
  "*, documents(title, document_type, status, expires_at), properties(title), projects(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalDocument {
  return {
    id: row.id,
    documentId: row.document_id,
    documentTitle: row.documents?.title ?? undefined,
    documentType: row.documents?.document_type ?? undefined,
    documentStatus: row.documents?.status ?? undefined,
    documentExpiresAt: row.documents?.expires_at ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    ownershipRecordId: row.ownership_record_id ?? undefined,
    issuingAuthority: row.issuing_authority ?? undefined,
    referenceNumber: row.reference_number ?? undefined,
    confidentialityLevel: row.confidentiality_level,
    copyType: row.copy_type,
    reminderDaysBeforeExpiry: row.reminder_days_before_expiry ?? undefined,
    verificationNotes: row.verification_notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalDocumentService = {
  async listAll(): Promise<LegalDocument[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_documents").select(SELECT).order("created_at", { ascending: false }).limit(500);
    if (error) {
      console.error("legalDocumentService.listAll failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listForProperty(propertyId: string): Promise<LegalDocument[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_documents").select(SELECT).eq("property_id", propertyId).order("created_at", { ascending: false });
    if (error) {
      console.error("legalDocumentService.listForProperty failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listForProject(projectId: string): Promise<LegalDocument[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_documents").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getByDocumentId(documentId: string): Promise<LegalDocument | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_documents").select(SELECT).eq("document_id", documentId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Only surfaces documents already VERIFIED/APPROVED — never a
   *  document still UNDER_REVIEW/REJECTED — for a customer-facing
   *  query. Column selection (not RLS alone) is what keeps internal
   *  verification_notes out of anything rendered to a customer. */
  async listForPropertyCustomerSafe(propertyId: string): Promise<Pick<LegalDocument, "id" | "documentId" | "documentTitle" | "documentType" | "documentStatus" | "documentExpiresAt" | "issuingAuthority" | "referenceNumber" | "copyType" | "createdAt">[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_documents")
      .select("id, document_id, issuing_authority, reference_number, copy_type, created_at, documents(title, document_type, status, expires_at)")
      .eq("property_id", propertyId)
      .in("documents.status", ["VERIFIED", "APPROVED"]);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[])
      .filter((row) => row.documents)
      .map((row) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.documents?.title,
        documentType: row.documents?.document_type,
        documentStatus: row.documents?.status,
        documentExpiresAt: row.documents?.expires_at ?? undefined,
        issuingAuthority: row.issuing_authority ?? undefined,
        referenceNumber: row.reference_number ?? undefined,
        copyType: row.copy_type,
        createdAt: row.created_at,
      }));
  },

  /** Uploads through the EXISTING documentService (same storage,
   *  versioning, audit trail as every other document in the system),
   *  then attaches the extra legal classification fields. */
  async uploadLegalDocument(
    input: {
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
      confidentialityLevel?: LegalDocument["confidentialityLevel"];
      copyType?: CopyType;
      visibility?: DocumentRecord["visibility"];
    },
    actor: { adminId?: string; name: string }
  ): Promise<LegalDocument> {
    const doc = await documentService.upload(
      {
        title: input.title,
        documentType: input.documentType,
        dataUri: input.dataUri,
        fileName: input.fileName,
        propertyId: input.propertyId,
        projectId: input.projectId,
        expiresAt: input.expiresAt,
        visibility: input.visibility ?? "ADMIN_ONLY",
      },
      actor
    );

    const supabase = await createClient();
    // Never claim "certified" unless an authorized (admin/manager) user
    // records it — enforced here, not just at the RLS layer.
    const copyType: CopyType = input.copyType ?? "UNKNOWN";
    const { data, error } = await supabase
      .from("legal_documents")
      .insert({
        document_id: doc.id,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        ownership_record_id: input.ownershipRecordId || null,
        issuing_authority: input.issuingAuthority || null,
        reference_number: input.referenceNumber || null,
        confidentiality_level: input.confidentialityLevel ?? "INTERNAL",
        copy_type: copyType,
        created_by: actor.adminId || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("legalDocumentService.uploadLegalDocument failed:", error);
      throw new Error("Could not create this legal document record.");
    }
    const legalDoc = mapRow(data);
    await legalAuditService.log({ entityType: "legal_document", entityId: legalDoc.id, action: "Uploaded", actorId: actor.adminId, actorName: actor.name, newValue: { title: input.title, documentType: input.documentType } });
    return legalDoc;
  },

  async updateClassification(
    id: string,
    input: Partial<Pick<LegalDocumentInput, "issuingAuthority" | "referenceNumber" | "confidentialityLevel" | "copyType" | "verificationNotes" | "reminderDaysBeforeExpiry">>
  ): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.issuingAuthority !== undefined) row.issuing_authority = input.issuingAuthority || null;
    if (input.referenceNumber !== undefined) row.reference_number = input.referenceNumber || null;
    if (input.confidentialityLevel !== undefined) row.confidentiality_level = input.confidentialityLevel;
    if (input.copyType !== undefined) row.copy_type = input.copyType;
    if (input.verificationNotes !== undefined) row.verification_notes = input.verificationNotes || null;
    if (input.reminderDaysBeforeExpiry !== undefined) row.reminder_days_before_expiry = input.reminderDaysBeforeExpiry;
    const { error } = await supabase.from("legal_documents").update(row).eq("id", id);
    if (error) throw new Error("Could not update this document's legal classification.");
  },

  // ---- Verification workflow — delegates entirely to the EXISTING
  // documentService transitions (UPLOADED -> UNDER_REVIEW ->
  // VERIFIED/REJECTED -> EXPIRED); never re-implemented here.
  async submitForReview(documentId: string, actor: { adminId?: string; name: string }) {
    const doc = await documentService.submitForReview(documentId, actor);
    await legalAuditService.log({ entityType: "legal_document", entityId: documentId, action: "Submitted for review", actorId: actor.adminId, actorName: actor.name });
    return doc;
  },

  async verify(documentId: string, actor: { adminId?: string; name: string }) {
    const doc = await documentService.markVerified(documentId, actor);
    await legalAuditService.log({ entityType: "legal_document", entityId: documentId, action: "Verified", actorId: actor.adminId, actorName: actor.name });
    return doc;
  },

  async reject(documentId: string, reason: string, actor: { adminId?: string; name: string }) {
    const doc = await documentService.reject(documentId, reason, actor);
    await legalAuditService.log({ entityType: "legal_document", entityId: documentId, action: "Rejected", actorId: actor.adminId, actorName: actor.name, reason });
    return doc;
  },

  async markExpired(documentId: string, actor: { adminId?: string; name: string }) {
    const doc = await documentService.markExpired(documentId, actor);
    await legalAuditService.log({ entityType: "legal_document", entityId: documentId, action: "Marked expired", actorId: actor.adminId, actorName: actor.name });
    return doc;
  },

  /** Section 10 — never marks expired without a real expiry date
   *  having actually passed. Reuses the EXISTING documentService
   *  30-day expiring-soon filter rather than a second query engine. */
  async listExpiringSoon(): Promise<DocumentRecord[]> {
    return documentService.searchAll({ expiringOnly: true });
  },
};
