import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import type { Encumbrance, EncumbranceInput, EncumbranceStatus, VerificationStatus } from "@/lib/models/legal";

const SELECT = "*, properties(title)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Encumbrance {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    encumbranceType: row.encumbrance_type,
    status: row.status,
    holderName: row.holder_name ?? undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    referenceNumber: row.reference_number ?? undefined,
    imposedDate: row.imposed_date ?? undefined,
    releasedDate: row.released_date ?? undefined,
    evidenceDocumentId: row.evidence_document_id ?? undefined,
    verificationStatus: row.verification_status,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const encumbranceService = {
  /** Never returns "clear" as a conclusion — an empty array means
   *  "none recorded", the caller/UI must say so explicitly, never
   *  "verified encumbrance-free". */
  async listForProperty(propertyId: string): Promise<Encumbrance[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("encumbrances").select(SELECT).eq("property_id", propertyId).order("created_at", { ascending: false });
    if (error) {
      console.error("encumbranceService.listForProperty failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<Encumbrance | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("encumbrances").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: EncumbranceInput, actorId: string, actorName: string): Promise<Encumbrance> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("encumbrances")
      .insert({
        property_id: input.propertyId,
        encumbrance_type: input.encumbranceType ?? "OTHER",
        holder_name: input.holderName || null,
        amount: input.amount ?? null,
        reference_number: input.referenceNumber || null,
        imposed_date: input.imposedDate || null,
        evidence_document_id: input.evidenceDocumentId || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("encumbranceService.create failed:", error);
      throw new Error("Could not record this encumbrance.");
    }
    const record = mapRow(data);
    await legalAuditService.log({ entityType: "encumbrance", entityId: record.id, action: "Recorded", actorId, actorName, newValue: { encumbranceType: record.encumbranceType, holderName: record.holderName } });
    return record;
  },

  async setStatus(id: string, status: EncumbranceStatus, actorId: string, actorName: string, releasedDate?: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { status };
    if (status === "RELEASED") row.released_date = releasedDate || new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("encumbrances").update(row).eq("id", id);
    if (error) throw new Error("Could not update this encumbrance's status.");
    await legalAuditService.log({ entityType: "encumbrance", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async setVerification(id: string, verificationStatus: VerificationStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("encumbrances").update({ verification_status: verificationStatus }).eq("id", id);
    if (error) throw new Error("Could not update this encumbrance's verification status.");
    await legalAuditService.log({ entityType: "encumbrance", entityId: id, action: `Verification set to ${verificationStatus}`, actorId, actorName });
  },
};
