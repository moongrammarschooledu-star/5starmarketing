import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveStorageDocuments, deleteStorageDocuments } from "./storage";
import type { DealDocument, DealDocumentType, DealDocumentStatus } from "@/lib/models/deal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): DealDocument {
  return {
    id: row.id,
    dealId: row.deal_id,
    name: row.name,
    url: row.url,
    documentType: row.document_type,
    status: row.status,
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const dealDocumentService = {
  async listByDeal(dealId: string): Promise<DealDocument[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_documents")
      .select("*, admin_profiles(name)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("dealDocumentService.listByDeal failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Reuses the existing "documents" Storage bucket / upload helper
   *  (already used by properties/projects/brochures) — no new bucket,
   *  no new upload mechanism. */
  async upload(dealId: string, name: string, documentType: DealDocumentType, dataUri: string, uploadedByAdminId?: string): Promise<DealDocument> {
    const [resolved] = await resolveStorageDocuments([{ name, url: dataUri }]);
    if (!resolved) throw new Error("Could not upload this document.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("deal_documents")
      .insert({
        deal_id: dealId,
        name: resolved.name,
        url: resolved.url,
        document_type: documentType,
        uploaded_by: uploadedByAdminId || null,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("dealDocumentService.upload failed:", error);
      throw new Error("Could not save this document.");
    }
    return mapRow(data);
  },

  async setStatus(id: string, status: DealDocumentStatus): Promise<DealDocument | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("deal_documents").update({ status }).eq("id", id).select("*, admin_profiles(name)").maybeSingle();
    if (error) {
      console.error("dealDocumentService.setStatus failed:", error);
      throw new Error("Could not update this document's status.");
    }
    return data ? mapRow(data) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { data } = await supabase.from("deal_documents").select("url").eq("id", id).maybeSingle();
    const { error } = await supabase.from("deal_documents").delete().eq("id", id);
    if (error) {
      console.error("dealDocumentService.remove failed:", error);
      throw new Error("Could not delete this document.");
    }
    if (data?.url) await deleteStorageDocuments([{ name: "", url: data.url }]);
  },
};
