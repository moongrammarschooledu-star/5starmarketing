import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseAttachmentDataUri, buildAttachmentStoragePath, uploadAttachmentFile, createSignedAttachmentUrl } from "@/lib/communication/attachmentStorage";
import type { CommAttachment } from "@/lib/models/communication";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CommAttachment {
  return {
    id: row.id,
    messageId: row.message_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export const communicationAttachmentService = {
  /** Attaches an already-validated file to a message the caller can
   *  already see (RLS on communication_messages/communication_attachments
   *  enforces this) — brochure/receipt/image/PDF only, per section 54. */
  async uploadForMessage(messageId: string, conversationId: string, fileName: string, dataUri: string): Promise<CommAttachment> {
    const { mimeType, bytes, extension } = parseAttachmentDataUri(dataUri);
    const path = buildAttachmentStoragePath(conversationId, messageId, extension);
    await uploadAttachmentFile(path, bytes, mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_attachments")
      .insert({ message_id: messageId, storage_path: path, file_name: fileName.slice(0, 200), mime_type: mimeType, file_size: bytes.byteLength })
      .select("*")
      .single();
    if (error) {
      console.error("communicationAttachmentService.uploadForMessage failed:", error);
      throw new Error("Could not attach this file.");
    }
    return mapRow(data);
  },

  /** Read-then-mint signed-URL pattern (STEP 20) — re-reads the
   *  attachment row through the CALLER's own RLS-scoped client first
   *  (throws if they can't see it), and only then mints a short-lived
   *  signed URL via the service-role client. */
  async getSignedUrl(attachmentId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_attachments").select("storage_path").eq("id", attachmentId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this file.");
    return createSignedAttachmentUrl(data.storage_path);
  },
};
