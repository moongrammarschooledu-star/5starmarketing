import "server-only";
import { createClient } from "@/lib/supabase/server";
import { activityService } from "./activityService";
import { parseUploadDataUri, hashBytes, buildStoragePath, uploadDocumentFile, deleteDocumentFiles, createSignedDocumentUrl } from "@/lib/documentStorage";
import type {
  DocumentRecord,
  DocumentInput,
  DocumentStatus,
  DocumentType,
  DocumentVersionEntry,
  DocumentAuditEntry,
  DocumentSearchFilters,
  DocumentSearchResult,
  DocumentDashboardStats,
  DocumentChecklistItem,
  DealChecklistProgress,
} from "@/lib/models/document";
import { DOCUMENT_ALLOWED_TRANSITIONS, DEFAULT_DOCUMENT_PAGE_SIZE, MAX_DOCUMENT_PAGE_SIZE } from "@/lib/models/document";

const SELECT_WITH_JOINS =
  "*, document_types(label), properties(title), projects(name), deals(deal_number), uploader:admin_profiles!documents_uploaded_by_fkey(name), verifier:admin_profiles!documents_verified_by_fkey(name), approver:admin_profiles!documents_approved_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DocumentRecord {
  return {
    id: row.id,
    documentNumber: row.document_number,
    title: row.title,
    documentType: row.document_type,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    customerId: row.customer_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    projectId: row.project_id ?? undefined,
    dealId: row.deal_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    installmentId: row.installment_id ?? undefined,
    templateId: row.template_id ?? undefined,
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedByCustomer: !!row.uploaded_by_customer,
    verifiedBy: row.verified_by ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    status: row.status,
    visibility: row.visibility,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size ?? 0),
    fileHash: row.file_hash ?? undefined,
    currentVersion: row.current_version,
    rejectionReason: row.rejection_reason ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentTypeLabel: row.document_types?.label ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    uploadedByName: row.uploader?.name ?? undefined,
    verifiedByName: row.verifier?.name ?? undefined,
    approvedByName: row.approver?.name ?? undefined,
  };
}

async function attachCustomerName(doc: DocumentRecord): Promise<DocumentRecord> {
  if (!doc.customerId) return doc;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name").eq("id", doc.customerId).maybeSingle();
  return data ? { ...doc, customerName: data.full_name ?? undefined } : doc;
}

/** Best-effort — records to document_audit_logs, AND mirrors into the
 *  existing activity_logs (entity_type='deal') when the document is
 *  deal-linked, so it appears on the Deal Timeline built in STEP 18
 *  (section 49). Never blocks the action it describes. */
async function logDocumentAudit(
  documentId: string,
  action: string,
  metadata: Record<string, unknown> | undefined,
  actor: { adminId?: string; customerId?: string; name: string },
  dealId?: string
) {
  try {
    const supabase = await createClient();
    await supabase.from("document_audit_logs").insert({
      document_id: documentId,
      actor_id: actor.adminId || null,
      actor_customer_id: actor.customerId || null,
      actor_name: actor.name,
      action,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error("logDocumentAudit failed:", e);
  }
  if (dealId) {
    await activityService.log(`Document ${action}`, `${actor.name}: ${action}`, "deal", dealId, { documentId, ...metadata });
  }
}

export const documentService = {
  // ---- Document types (section 4) ----
  async listTypes(activeOnly = true): Promise<DocumentType[]> {
    const supabase = await createClient();
    let query = supabase.from("document_types").select("*").order("sort_order", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("documentService.listTypes failed:", error);
      return [];
    }
    return (data ?? []).map((r) => ({ code: r.code, label: r.label, category: r.category, requiresExpiry: !!r.requires_expiry, active: !!r.active, sortOrder: r.sort_order }));
  },

  async createType(input: { code: string; label: string; category: string; requiresExpiry?: boolean; sortOrder?: number }): Promise<DocumentType> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_types")
      .insert({ code: input.code.trim().toUpperCase().replace(/\s+/g, "_"), label: input.label, category: input.category, requires_expiry: input.requiresExpiry ?? false, sort_order: input.sortOrder ?? 500 })
      .select("*")
      .single();
    if (error) {
      console.error("documentService.createType failed:", error);
      if (error.code === "23505") throw new Error("A document type with this code already exists.");
      throw new Error("Could not create this document type.");
    }
    return { code: data.code, label: data.label, category: data.category, requiresExpiry: !!data.requires_expiry, active: !!data.active, sortOrder: data.sort_order };
  },

  async setTypeActive(code: string, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("document_types").update({ active }).eq("code", code);
    if (error) throw new Error("Could not update this document type.");
  },

  // ---- Search / read ----
  async search(filters: DocumentSearchFilters): Promise<DocumentSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_DOCUMENT_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_DOCUMENT_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("documents").select(SELECT_WITH_JOINS, { count: "exact" });
    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`document_number.ilike.%${q}%,title.ilike.%${q}%`);
    }
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.documentType) query = query.eq("document_type", filters.documentType);
    if (filters.customerId) query = query.eq("customer_id", filters.customerId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.dealId) query = query.eq("deal_id", filters.dealId);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lt("created_at", filters.dateTo);
    if (filters.expiringOnly) {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      query = query.not("expires_at", "is", null).lte("expires_at", in30Days.toISOString().slice(0, 10));
    }
    if (filters.agentId) {
      const { data: agentDeals } = await supabase.from("deals").select("id").eq("agent_id", filters.agentId);
      const ids = (agentDeals ?? []).map((d) => d.id);
      query = query.in("deal_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }

    query = query.order("created_at", { ascending: false });
    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("documentService.search failed:", error);
      throw new Error("Could not load documents.");
    }
    const documents = await Promise.all((data ?? []).map((r) => attachCustomerName(mapRow(r))));
    const total = count ?? 0;
    return { documents, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async searchAll(filters: DocumentSearchFilters, hardLimit = 5000): Promise<DocumentRecord[]> {
    const { documents } = await this.search({ ...filters, page: 1, pageSize: hardLimit });
    return documents;
  },

  async getById(id: string): Promise<DocumentRecord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("documents").select(SELECT_WITH_JOINS).eq("id", id).maybeSingle();
    if (error) {
      console.error("documentService.getById failed:", error);
      throw new Error("Could not load this document.");
    }
    return data ? attachCustomerName(mapRow(data)) : undefined;
  },

  async listByDeal(dealId: string): Promise<DocumentRecord[]> {
    const { documents } = await this.search({ dealId, pageSize: MAX_DOCUMENT_PAGE_SIZE });
    return documents;
  },

  async listByCustomer(customerId: string): Promise<DocumentRecord[]> {
    const { documents } = await this.search({ customerId, pageSize: MAX_DOCUMENT_PAGE_SIZE });
    return documents;
  },

  async listByProperty(propertyId: string): Promise<DocumentRecord[]> {
    const { documents } = await this.search({ propertyId, pageSize: MAX_DOCUMENT_PAGE_SIZE });
    return documents;
  },

  async listByProject(projectId: string): Promise<DocumentRecord[]> {
    const { documents } = await this.search({ projectId, pageSize: MAX_DOCUMENT_PAGE_SIZE });
    return documents;
  },

  // ---- Upload / versioning ----
  async upload(input: DocumentInput, actor: { adminId?: string; customerId?: string; name: string }): Promise<DocumentRecord> {
    const parsed = parseUploadDataUri(input.dataUri);
    const fileHash = hashBytes(parsed.bytes);
    const supabase = await createClient();

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        title: input.title,
        document_type: input.documentType,
        category: input.category || null,
        description: input.description || null,
        customer_id: input.customerId || null,
        lead_id: input.leadId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        payment_id: input.paymentId || null,
        installment_id: input.installmentId || null,
        template_id: input.templateId || null,
        uploaded_by: actor.adminId || null,
        uploaded_by_customer: !!actor.customerId,
        status: "UPLOADED",
        visibility: input.visibility ?? "ADMIN_CUSTOMER",
        file_name: input.fileName,
        storage_path: "pending",
        mime_type: parsed.mimeType,
        file_size: parsed.bytes.byteLength,
        file_hash: fileHash,
        expires_at: input.expiresAt || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("documentService.upload (insert) failed:", insertError);
      throw new Error("Could not create this document record.");
    }

    const documentId = inserted.id;
    const path = buildStoragePath({ customerId: input.customerId, dealId: input.dealId, propertyId: input.propertyId, projectId: input.projectId, paymentId: input.paymentId }, documentId, parsed.extension);

    try {
      await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);
    } catch (e) {
      await supabase.from("documents").delete().eq("id", documentId);
      throw e;
    }

    await supabase.from("documents").update({ storage_path: path }).eq("id", documentId);
    await supabase.from("document_versions").insert({
      document_id: documentId,
      version_number: 1,
      storage_path: path,
      file_name: input.fileName,
      mime_type: parsed.mimeType,
      file_size: parsed.bytes.byteLength,
      file_hash: fileHash,
      uploaded_by: actor.adminId || null,
      uploaded_by_customer: !!actor.customerId,
    });

    await logDocumentAudit(documentId, "Uploaded", { fileName: input.fileName, documentType: input.documentType }, actor, input.dealId);

    const doc = await this.getById(documentId);
    if (!doc) throw new Error("Document was created but could not be loaded.");
    return doc;
  },

  /** Same as upload(), but for a PDF rendered server-side (booking
   *  forms, agreements, receipts — sections 23-26, 35-36) rather than a
   *  browser data: URI. Shares the exact same storage-path/versioning/
   *  audit mechanics as a human upload. */
  async createGeneratedDocument(
    input: Omit<DocumentInput, "dataUri"> & { bytes: Buffer; mimeType: string },
    actor: { adminId?: string; name: string }
  ): Promise<DocumentRecord> {
    const fileHash = hashBytes(input.bytes);
    const supabase = await createClient();

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        title: input.title,
        document_type: input.documentType,
        category: input.category || null,
        description: input.description || null,
        customer_id: input.customerId || null,
        lead_id: input.leadId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        payment_id: input.paymentId || null,
        installment_id: input.installmentId || null,
        template_id: input.templateId || null,
        uploaded_by: actor.adminId || null,
        status: "DRAFT",
        visibility: input.visibility ?? "ADMIN_CUSTOMER",
        file_name: input.fileName,
        storage_path: "pending",
        mime_type: input.mimeType,
        file_size: input.bytes.byteLength,
        file_hash: fileHash,
        expires_at: input.expiresAt || null,
      })
      .select("id")
      .single();
    if (insertError) {
      console.error("documentService.createGeneratedDocument (insert) failed:", insertError);
      throw new Error("Could not create this generated document.");
    }

    const documentId = inserted.id;
    const path = buildStoragePath({ customerId: input.customerId, dealId: input.dealId, propertyId: input.propertyId, projectId: input.projectId, paymentId: input.paymentId }, documentId, "pdf");
    await uploadDocumentFile(path, input.bytes, input.mimeType);
    await supabase.from("documents").update({ storage_path: path, status: "UPLOADED" }).eq("id", documentId);
    await supabase.from("document_versions").insert({
      document_id: documentId,
      version_number: 1,
      storage_path: path,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: input.bytes.byteLength,
      file_hash: fileHash,
      uploaded_by: actor.adminId || null,
    });
    await logDocumentAudit(documentId, "Uploaded", { generated: true, documentType: input.documentType }, actor, input.dealId);

    const doc = await this.getById(documentId);
    if (!doc) throw new Error("Document was generated but could not be loaded.");
    return doc;
  },

  /** New version (section 11) — the old file/version is preserved in
   *  document_versions, never overwritten. Resets status to UPLOADED so
   *  it goes through review again. */
  async replace(documentId: string, input: { dataUri: string; fileName: string; reason?: string }, actor: { adminId?: string; customerId?: string; name: string }): Promise<DocumentRecord> {
    const current = await this.getById(documentId);
    if (!current) throw new Error("Document not found.");
    const parsed = parseUploadDataUri(input.dataUri);
    const fileHash = hashBytes(parsed.bytes);
    const supabase = await createClient();

    const path = buildStoragePath({ customerId: current.customerId, dealId: current.dealId, propertyId: current.propertyId, projectId: current.projectId, paymentId: current.paymentId }, documentId, parsed.extension);
    await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);

    const nextVersion = current.currentVersion + 1;
    await supabase.from("document_versions").insert({
      document_id: documentId,
      version_number: nextVersion,
      storage_path: path,
      file_name: input.fileName,
      mime_type: parsed.mimeType,
      file_size: parsed.bytes.byteLength,
      file_hash: fileHash,
      uploaded_by: actor.adminId || null,
      uploaded_by_customer: !!actor.customerId,
      reason: input.reason || null,
    });

    const { data, error } = await supabase
      .from("documents")
      .update({
        storage_path: path,
        file_name: input.fileName,
        mime_type: parsed.mimeType,
        file_size: parsed.bytes.byteLength,
        file_hash: fileHash,
        current_version: nextVersion,
        status: "UPLOADED",
        verified_by: null,
        approved_by: null,
        verified_at: null,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      })
      .eq("id", documentId)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("documentService.replace failed:", error);
      throw new Error("Could not save the new version.");
    }
    await logDocumentAudit(documentId, "Replaced", { version: nextVersion, reason: input.reason }, actor, current.dealId);
    return data ? attachCustomerName(mapRow(data)) : current;
  },

  async listVersions(documentId: string): Promise<DocumentVersionEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_versions")
      .select("*, admin_profiles(name)")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      storagePath: row.storage_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: Number(row.file_size ?? 0),
      fileHash: row.file_hash ?? undefined,
      uploadedBy: row.uploaded_by ?? undefined,
      uploadedByName: row.admin_profiles?.name ?? undefined,
      uploadedByCustomer: !!row.uploaded_by_customer,
      reason: row.reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  // ---- Status transitions (section 7) ----
  async _transition(documentId: string, newStatus: DocumentStatus, extra: Record<string, unknown>, action: string, actor: { adminId?: string; customerId?: string; name: string }): Promise<DocumentRecord> {
    const current = await this.getById(documentId);
    if (!current) throw new Error("Document not found.");
    if (!DOCUMENT_ALLOWED_TRANSITIONS[current.status]?.includes(newStatus)) {
      throw new Error(`Cannot move a document from "${current.status}" to "${newStatus}".`);
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .update({ status: newStatus, ...extra })
      .eq("id", documentId)
      .eq("status", current.status)
      .select(SELECT_WITH_JOINS)
      .maybeSingle();
    if (error) {
      console.error("documentService._transition failed:", error);
      throw new Error("Could not update this document's status.");
    }
    if (!data) throw new Error("This document's status has already changed — please refresh and try again.");
    await logDocumentAudit(documentId, action, extra, actor, current.dealId);
    return attachCustomerName(mapRow(data));
  },

  async submitForReview(documentId: string, actor: { adminId?: string; customerId?: string; name: string }) {
    return this._transition(documentId, "UNDER_REVIEW", {}, "Submitted for Review", actor);
  },

  async markVerified(documentId: string, actor: { adminId?: string; name: string }) {
    return this._transition(documentId, "VERIFIED", { verified_by: actor.adminId || null, verified_at: new Date().toISOString() }, "Verified", actor);
  },

  async approve(documentId: string, actor: { adminId?: string; name: string }) {
    return this._transition(documentId, "APPROVED", { approved_by: actor.adminId || null, approved_at: new Date().toISOString() }, "Approved", actor);
  },

  async reject(documentId: string, reason: string, actor: { adminId?: string; name: string }) {
    if (!reason.trim()) throw new Error("A rejection reason is required.");
    return this._transition(documentId, "REJECTED", { rejection_reason: reason, rejected_at: new Date().toISOString() }, "Rejected", actor);
  },

  async archive(documentId: string, actor: { adminId?: string; name: string }) {
    return this._transition(documentId, "ARCHIVED", { archived_at: new Date().toISOString() }, "Archived", actor);
  },

  async restore(documentId: string, actor: { adminId?: string; name: string }) {
    return this._transition(documentId, "UPLOADED", { archived_at: null }, "Restored", actor);
  },

  async markExpired(documentId: string, actor: { adminId?: string; name: string }) {
    return this._transition(documentId, "EXPIRED", {}, "Expired", actor);
  },

  // ---- Secure access (sections 8, 12, 41, 58) ----
  /** The single authorization boundary for reading a private file: this
   *  RE-READS the document row through the CALLER's own RLS-scoped
   *  client first (throws if they can't see it), and only THEN mints a
   *  short-lived signed URL. Logs the access as an audit event. */
  async getSignedUrl(documentId: string, kind: "Viewed" | "Downloaded", actor: { adminId?: string; customerId?: string; name: string }): Promise<string> {
    const doc = await this.getById(documentId);
    if (!doc) throw new Error("You are not authorized to view this document.");
    const url = await createSignedDocumentUrl(doc.storagePath);
    await logDocumentAudit(documentId, kind, undefined, actor, doc.dealId);
    return url;
  },

  async remove(documentId: string, actor: { adminId?: string; name: string }): Promise<void> {
    const doc = await this.getById(documentId);
    if (!doc) return;
    const versions = await this.listVersions(documentId);
    // Deleting the row cascades away document_audit_logs too, so record the
    // deletion where it survives: the deal timeline (if this document was
    // deal-linked), logged before the row — and its own audit trail — are gone.
    if (doc.dealId) {
      await activityService.log("Document Deleted", `${actor.name} deleted "${doc.title}"`, "deal", doc.dealId, { documentId, documentNumber: doc.documentNumber });
    }
    const supabase = await createClient();
    const { error } = await supabase.from("documents").delete().eq("id", documentId);
    if (error) {
      console.error("documentService.remove failed:", error);
      throw new Error("Could not delete this document.");
    }
    await deleteDocumentFiles(versions.map((v) => v.storagePath));
  },

  async listAuditLog(documentId: string): Promise<DocumentAuditEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("document_audit_logs").select("*").eq("document_id", documentId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => ({ id: row.id, documentId: row.document_id, actorId: row.actor_id ?? undefined, actorName: row.actor_name ?? undefined, action: row.action, metadata: row.metadata ?? undefined, createdAt: row.created_at }));
  },

  // ---- Checklists / completion (sections 13-15, 69) ----
  async getApplicableChecklistItems(dealType?: string, propertyType?: string): Promise<DocumentChecklistItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_checklist_items")
      .select("*, document_types(label), document_checklists(name)")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("documentService.getApplicableChecklistItems failed:", error);
      return [];
    }
    return (data ?? [])
      .filter((row) => (!row.applicable_deal_type || row.applicable_deal_type === dealType) && (!row.applicable_property_type || row.applicable_property_type === propertyType))
      .map((row) => ({
        id: row.id,
        checklistId: row.checklist_id,
        documentType: row.document_type,
        required: !!row.required,
        description: row.description ?? undefined,
        sortOrder: row.sort_order,
        applicablePropertyType: row.applicable_property_type ?? undefined,
        applicableDealType: row.applicable_deal_type ?? undefined,
        active: !!row.active,
        documentTypeLabel: row.document_types?.label ?? undefined,
        checklistName: row.document_checklists?.name ?? undefined,
      }));
  },

  async getDealChecklistProgress(dealId: string, dealType?: string, propertyType?: string): Promise<DealChecklistProgress> {
    const [items, documents] = await Promise.all([this.getApplicableChecklistItems(dealType, propertyType), this.listByDeal(dealId)]);
    const requiredItems = items.filter((i) => i.required);
    const rows = items.map((item) => {
      const document = documents.filter((d) => d.documentType === item.documentType).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return { item, document };
    });
    const completedRequired = rows.filter((r) => r.item.required && r.document?.status === "APPROVED").length;
    return {
      totalRequired: requiredItems.length,
      completedRequired,
      percent: requiredItems.length > 0 ? Math.round((completedRequired / requiredItems.length) * 100) : 100,
      items: rows,
    };
  },

  async isDealDocumentationComplete(dealId: string, dealType?: string, propertyType?: string): Promise<boolean> {
    const progress = await this.getDealChecklistProgress(dealId, dealType, propertyType);
    return progress.totalRequired === 0 || progress.completedRequired === progress.totalRequired;
  },

  // ---- Dashboard (section 20) ----
  async dashboardStats(): Promise<DocumentDashboardStats> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("documents").select("status, created_at, expires_at");
    if (error) {
      console.error("documentService.dashboardStats failed:", error);
      throw new Error("Could not load document statistics.");
    }
    const rows = data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartIso = monthStart.toISOString().slice(0, 10);
    return {
      total: rows.length,
      pendingReview: rows.filter((r) => r.status === "UNDER_REVIEW" || r.status === "UPLOADED").length,
      approved: rows.filter((r) => r.status === "APPROVED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
      expired: rows.filter((r) => r.status === "EXPIRED" || (r.expires_at && r.expires_at < today)).length,
      uploadedThisMonth: rows.filter((r) => r.created_at >= monthStartIso).length,
    };
  },
};
