import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "expense-attachments";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ParsedExpenseUpload {
  mimeType: string;
  bytes: Buffer;
  extension: string;
}

/** Mirrors documentStorage.ts/attachmentStorage.ts exactly (section 17)
 *  — never trusts the browser-supplied filename/extension, only the
 *  real MIME type encoded in the data URI and the actual byte length. */
export function parseExpenseAttachmentDataUri(dataUri: string): ParsedExpenseUpload {
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

export function buildExpenseAttachmentPath(expenseId: string, extension: string): string {
  return `expenses/${expenseId}/${randomUUID()}.${extension}`;
}

/** Uses the CALLER's own session-bound client — respects the storage
 *  RLS policies (admin/manager/agent-submitting-their-own insert)
 *  exactly as written in the migration. */
export async function uploadExpenseAttachmentFile(path: string, bytes: Buffer, mimeType: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("uploadExpenseAttachmentFile failed:", error);
    throw new Error("Could not upload this file. Please try again.");
  }
}

/** The ONLY place a signed URL is minted for this bucket — the caller
 *  (expenseService.getAttachmentSignedUrl) must have already confirmed
 *  read access to the metadata row under ITS OWN RLS before calling
 *  this; that earlier read is the real authorization boundary. */
export async function createSignedExpenseAttachmentUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    console.error("createSignedExpenseAttachmentUrl failed:", error);
    throw new Error("Could not generate a secure link for this file.");
  }
  return data.signedUrl;
}
