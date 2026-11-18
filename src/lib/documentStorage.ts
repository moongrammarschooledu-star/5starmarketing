import "server-only";
import { createHash, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "secure-documents";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** File extension for an allowed MIME type, or undefined if the type is not allowed. */
export function extensionForMime(mimeType: string): string | undefined {
  return ALLOWED_TYPES[mimeType];
}
export const MAX_DOCUMENT_BYTES = MAX_BYTES;

export interface ParsedUpload {
  mimeType: string;
  bytes: Buffer;
  extension: string;
}

/** Validates a data: URI against the allowed type/size list (section
 *  10) — never trusts the browser-supplied filename or its extension,
 *  only the actual MIME type encoded in the data URI and the real byte
 *  length. */
export function parseUploadDataUri(dataUri: string): ParsedUpload {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid file data.");
  const [, mimeType, base64] = match;
  const extension = ALLOWED_TYPES[mimeType];
  if (!extension) throw new Error(`Unsupported file type: ${mimeType}. Use PDF, JPG, PNG or WEBP.`);
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength === 0) throw new Error("The uploaded file is empty.");
  if (bytes.byteLength > MAX_BYTES) throw new Error("File is larger than 15MB.");
  return { mimeType, bytes, extension };
}

export function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Structured, scope-prefixed storage path (section 9) — the prefix is
 *  also what the customer-upload storage RLS policy checks against
 *  (customers/{auth.uid()}/...), so this exact shape is load-bearing,
 *  not just organizational. */
export function buildStoragePath(
  scope: {
    customerId?: string;
    contactId?: string;
    dealId?: string;
    propertyId?: string;
    projectId?: string;
    paymentId?: string;
    inspectionId?: string;
    workOrderId?: string;
    assetId?: string;
    vendorId?: string;
    maintenanceRequestId?: string;
    constructionProjectId?: string;
    constructionDocumentProjectId?: string;
    leaseId?: string;
  },
  documentId: string,
  extension: string
): string {
  const safeName = `${randomUUID()}.${extension}`;
  // Customer-uploaded maintenance request photos MUST stay under this
  // exact customers/{auth.uid()}/... prefix — it is what the existing
  // secure_documents_customer_insert storage policy checks against.
  if (scope.customerId && scope.maintenanceRequestId) return `customers/${scope.customerId}/maintenance-requests/${scope.maintenanceRequestId}/${documentId}/${safeName}`;
  if (scope.customerId) return `customers/${scope.customerId}/documents/${documentId}/${safeName}`;
  if (scope.dealId) return `deals/${scope.dealId}/documents/${documentId}/${safeName}`;
  if (scope.paymentId) return `payments/${scope.paymentId}/receipts/${documentId}/${safeName}`;
  if (scope.inspectionId) return `inspections/${scope.inspectionId}/photos/${documentId}/${safeName}`;
  if (scope.workOrderId) return `work-orders/${scope.workOrderId}/photos/${documentId}/${safeName}`;
  if (scope.constructionProjectId) return `construction-projects/${scope.constructionProjectId}/media/${documentId}/${safeName}`;
  if (scope.constructionDocumentProjectId) return `construction-projects/${scope.constructionDocumentProjectId}/documents/${documentId}/${safeName}`;
  if (scope.leaseId) return `leases/${scope.leaseId}/documents/${documentId}/${safeName}`;
  if (scope.maintenanceRequestId) return `maintenance-requests/${scope.maintenanceRequestId}/photos/${documentId}/${safeName}`;
  if (scope.assetId) return `assets/${scope.assetId}/documents/${documentId}/${safeName}`;
  if (scope.vendorId) return `vendors/${scope.vendorId}/documents/${documentId}/${safeName}`;
  if (scope.propertyId) return `properties/${scope.propertyId}/documents/${documentId}/${safeName}`;
  if (scope.projectId) return `projects/${scope.projectId}/documents/${documentId}/${safeName}`;
  if (scope.contactId) return `contacts/${scope.contactId}/documents/${documentId}/${safeName}`;
  return `general/documents/${documentId}/${safeName}`;
}

/** Uploads using the CALLER's own session-bound client — respects the
 *  storage RLS policies (staff vs. customer-own-prefix) exactly as
 *  written in the migration; never uses the service-role client for
 *  writes. */
export async function uploadDocumentFile(path: string, bytes: Buffer, mimeType: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("uploadDocumentFile failed:", error);
    throw new Error("Could not upload this file. Please try again.");
  }
}

export async function deleteDocumentFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("deleteDocumentFiles failed:", error);
}

/** What is really stored at a path (size and type as the storage server saw them),
 *  or null when nothing is there. Used to check a file the browser uploaded itself. */
export async function getStoredObjectInfo(path: string): Promise<{ size: number; mimeType: string } | null> {
  const supabase = createServiceRoleClient();
  const slash = path.lastIndexOf("/");
  const dir = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 5 });
  if (error) {
    console.error("getStoredObjectInfo failed:", error);
    return null;
  }
  const hit = (data ?? []).find((o) => o.name === name);
  if (!hit) return null;
  const meta = (hit.metadata ?? {}) as { size?: number; mimetype?: string };
  return { size: Number(meta.size ?? 0), mimeType: String(meta.mimetype ?? "") };
}

/** Removes files with the service role - for cleaning up an upload that went wrong
 *  or never finished (the caller already confirmed it is allowed to). */
export async function removeStoredObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("removeStoredObjects failed:", error);
}

/** The ONLY place a signed URL is minted (section 41/58) — deliberately
 *  uses the service-role client, since createSignedUrl is itself a
 *  privileged operation. The caller (documentService.getSignedUrl) is
 *  responsible for confirming the requester could already read the
 *  corresponding `documents` metadata row under ITS OWN RLS before
 *  calling this — that earlier read is the real authorization boundary,
 *  this function just mints a short-lived (5 minute) URL for an
 *  already-authorized path. */
export async function createSignedDocumentUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("createSignedDocumentUrl failed:", error);
    throw new Error("Could not generate a secure link for this document.");
  }
  return data.signedUrl;
}
