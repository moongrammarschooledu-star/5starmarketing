import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "communication-attachments";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ParsedAttachmentUpload {
  mimeType: string;
  bytes: Buffer;
  extension: string;
}

/** Validates a data: URI against the allowed type/size list (section
 *  55) — never trusts the browser-supplied filename or its extension,
 *  only the actual MIME type encoded in the data URI and the real byte
 *  length. Mirrors documentStorage.ts's parseUploadDataUri exactly. */
export function parseAttachmentDataUri(dataUri: string): ParsedAttachmentUpload {
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

export function buildAttachmentStoragePath(conversationId: string, messageId: string, extension: string): string {
  return `conversations/${conversationId}/${messageId}/${randomUUID()}.${extension}`;
}

/** Uploads using the CALLER's own session-bound client — respects the
 *  storage RLS policies (admin/manager/agent insert only) exactly as
 *  written in the migration; never uses the service-role client for
 *  writes. */
export async function uploadAttachmentFile(path: string, bytes: Buffer, mimeType: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("uploadAttachmentFile failed:", error);
    throw new Error("Could not upload this file. Please try again.");
  }
}

/** The ONLY place a signed URL is minted for this bucket — deliberately
 *  uses the service-role client, since createSignedUrl is itself a
 *  privileged operation. The caller (communicationAttachmentService) is
 *  responsible for confirming the requester could already read the
 *  corresponding communication_attachments metadata row under ITS OWN
 *  RLS before calling this — that earlier read is the real authorization
 *  boundary, this function just mints a short-lived (5 minute) URL for an
 *  already-authorized path. */
export async function createSignedAttachmentUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("createSignedAttachmentUrl failed:", error);
    throw new Error("Could not generate a secure link for this file.");
  }
  return data.signedUrl;
}
