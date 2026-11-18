import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizeAgreementData, type RentAgreementData } from "@/lib/rentAgreement/types";

export interface RentAgreementRecord {
  id: string;
  agreementNo: string;
  data: RentAgreementData;
  leaseId?: string;
  propertyId?: string;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentAgreementRecord {
  return {
    id: row.id,
    agreementNo: row.agreement_no,
    data: normalizeAgreementData(row.data),
    leaseId: row.lease_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    documentId: row.document_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function columnsFor(data: RentAgreementData) {
  return {
    language: data.language,
    paper: data.paper,
    owner_name: data.owner.name.trim() || data.owner.nameUr.trim(),
    tenant_name: data.tenant.name.trim() || data.tenant.nameUr.trim(),
    monthly_rent: data.monthlyRent,
    start_date: data.startDate || null,
    data,
  };
}

function friendly(error: { code?: string; message: string }, what: string): Error {
  if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
    return new Error("The rent agreements table is not set up in the database yet. Run the migration 2026-11-18-rent-agreements.sql first.");
  }
  return new Error(what);
}

export const rentAgreementService = {
  async list(): Promise<RentAgreementRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_agreements").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) {
      console.error("rentAgreementService.list failed:", error);
      throw friendly(error, "Could not load the rent agreements.");
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentAgreementRecord | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const supabase = await createClient();
    const { data, error } = await supabase.from("rent_agreements").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("rentAgreementService.getById failed:", error);
      throw friendly(error, "Could not load this rent agreement.");
    }
    return data ? mapRow(data) : undefined;
  },

  async create(data: RentAgreementData, links: { leaseId?: string; propertyId?: string }, adminId?: string): Promise<RentAgreementRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("rent_agreements")
      .insert({ ...columnsFor(data), lease_id: links.leaseId || null, property_id: links.propertyId || null, created_by: adminId || null })
      .select("*")
      .single();
    if (error) {
      console.error("rentAgreementService.create failed:", error);
      throw friendly(error, "Could not save this rent agreement.");
    }
    return mapRow(row);
  },

  async update(id: string, data: RentAgreementData): Promise<RentAgreementRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("rent_agreements")
      .update({ ...columnsFor(data), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("rentAgreementService.update failed:", error);
      throw friendly(error, "Could not save this rent agreement.");
    }
    return mapRow(row);
  },

  async setDocumentId(id: string, documentId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rent_agreements").update({ document_id: documentId }).eq("id", id);
    if (error) console.error("rentAgreementService.setDocumentId failed:", error);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rent_agreements").delete().eq("id", id);
    if (error) {
      console.error("rentAgreementService.remove failed:", error);
      throw new Error("Could not delete this rent agreement.");
    }
  },
};
