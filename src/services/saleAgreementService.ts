import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizeSaleData, type SaleAgreementData } from "@/lib/saleAgreement/types";

export interface SaleAgreementRecord {
  id: string;
  agreementNo: string;
  data: SaleAgreementData;
  propertyId?: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SaleAgreementRecord {
  return {
    id: row.id,
    agreementNo: row.agreement_no,
    data: normalizeSaleData(row.data),
    propertyId: row.property_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function columnsFor(data: SaleAgreementData) {
  return {
    language: data.language,
    paper: data.paper,
    seller_name: data.seller.name.trim() || data.seller.nameUr.trim(),
    buyer_name: data.buyer.name.trim() || data.buyer.nameUr.trim(),
    total_price: data.totalPrice,
    agreement_date: data.agreementDate || null,
    data,
  };
}

function friendly(error: { code?: string; message: string }, what: string): Error {
  if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
    return new Error("The sale agreements table is not set up in the database yet. Run the migration 2026-11-18-sale-agreements.sql first.");
  }
  return new Error(what);
}

export const saleAgreementService = {
  async list(): Promise<SaleAgreementRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("sale_agreements").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) {
      console.error("saleAgreementService.list failed:", error);
      throw friendly(error, "Could not load the sale agreements.");
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SaleAgreementRecord | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const supabase = await createClient();
    const { data, error } = await supabase.from("sale_agreements").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("saleAgreementService.getById failed:", error);
      throw friendly(error, "Could not load this sale agreement.");
    }
    return data ? mapRow(data) : undefined;
  },

  async create(data: SaleAgreementData, propertyId: string | undefined, adminId?: string): Promise<SaleAgreementRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("sale_agreements")
      .insert({ ...columnsFor(data), property_id: propertyId || null, created_by: adminId || null })
      .select("*")
      .single();
    if (error) {
      console.error("saleAgreementService.create failed:", error);
      throw friendly(error, "Could not save this sale agreement.");
    }
    return mapRow(row);
  },

  async update(id: string, data: SaleAgreementData): Promise<SaleAgreementRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("sale_agreements")
      .update({ ...columnsFor(data), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("saleAgreementService.update failed:", error);
      throw friendly(error, "Could not save this sale agreement.");
    }
    return mapRow(row);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("sale_agreements").delete().eq("id", id);
    if (error) {
      console.error("saleAgreementService.remove failed:", error);
      throw new Error("Could not delete this sale agreement.");
    }
  },
};
