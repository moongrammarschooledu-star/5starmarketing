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
export function buildStoragePath(scope: { customerId?: string; dealId?: string; propertyId?: string; projectId?: string; paymentId?: string }, documentId: string, extension: string): string {
  const safeName = `${randomUUID()}.${extension}`;
  if (scope.customerId) return `customers/${scope.customerId}/documents/${documentId}/${safeName}`;
  if (scope.dealId) return `deals/${scope.dealId}/documents/${documentId}/${safeName}`;
  if (scope.paymentId) return `payments/${scope.paymentId}/receipts/${documentId}/${safeName}`;
  if (scope.propertyId) return `properties/${scope.propertyId}/documents/${documentId}/${safeName}`;
  if (scope.projectId) return `projects/${scope.projectId}/documents/${documentId}/${safeName}`;
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
