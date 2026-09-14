import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import type { LegalPropertyRecord } from "@/lib/models/legal";

const SELECT = "*, properties(title), officer:admin_profiles!legal_property_records_legal_officer_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalPropertyRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    legalOfficerId: row.legal_officer_id ?? undefined,
    legalOfficerName: row.officer?.name ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalPropertyService = {
  async list(filters?: { legalOfficerId?: string }): Promise<LegalPropertyRecord[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_property_records").select(SELECT).order("created_at", { ascending: false });
    if (filters?.legalOfficerId) query = query.eq("legal_officer_id", filters.legalOfficerId);
    const { data, error } = await query;
    if (error) {
      console.error("legalPropertyService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getByPropertyId(propertyId: string): Promise<LegalPropertyRecord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_property_records").select(SELECT).eq("property_id", propertyId).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Ensures a property has a legal record without duplicating one —
   *  called lazily the first time any legal module page touches a
   *  property, never pre-seeded for every property in bulk. */
  async ensureForProperty(propertyId: string): Promise<LegalPropertyRecord> {
    const existing = await this.getByPropertyId(propertyId);
    if (existing) return existing;
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_property_records").insert({ property_id: propertyId }).select(SELECT).single();
    if (error) {
      console.error("legalPropertyService.ensureForProperty failed:", error);
      throw new Error("Could not create a legal record for this property.");
    }
    return mapRow(data);
  },

  async assignOfficer(propertyId: string, legalOfficerId: string | null, actorId: string, actorName: string): Promise<void> {
    await this.ensureForProperty(propertyId);
    const supabase = await createClient();
    const { error } = await supabase.from("legal_property_records").update({ legal_officer_id: legalOfficerId }).eq("property_id", propertyId);
    if (error) throw new Error("Could not assign a legal officer to this property.");
    await legalAuditService.log({ entityType: "legal_property_record", entityId: propertyId, action: legalOfficerId ? "Legal officer assigned" : "Legal officer unassigned", actorId, actorName });
  },

  async updateNotes(propertyId: string, internalNotes: string): Promise<void> {
    await this.ensureForProperty(propertyId);
    const supabase = await createClient();
    const { error } = await supabase.from("legal_property_records").update({ internal_notes: internalNotes || null }).eq("property_id", propertyId);
    if (error) throw new Error("Could not update this property's legal notes.");
  },
};
