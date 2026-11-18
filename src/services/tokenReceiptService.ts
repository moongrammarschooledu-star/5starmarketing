import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizeTokenData, type TokenReceiptData } from "@/lib/tokenReceipt/types";

export interface TokenReceiptRecord {
  id: string;
  receiptNo: string;
  data: TokenReceiptData;
  propertyId?: string;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): TokenReceiptRecord {
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    data: normalizeTokenData(row.data),
    propertyId: row.property_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function columnsFor(data: TokenReceiptData) {
  return {
    language: data.language,
    payer_name: data.payer.name.trim() || data.payer.nameUr.trim(),
    amount: data.amount,
    receipt_date: data.receiptDate || null,
    data,
  };
}

function friendly(error: { code?: string; message: string }, what: string): Error {
  if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
    return new Error("The token receipts table is not set up in the database yet. Run the migration 2026-11-18-token-receipts.sql first.");
  }
  return new Error(what);
}

export const tokenReceiptService = {
  async list(): Promise<TokenReceiptRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("token_receipts").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) {
      console.error("tokenReceiptService.list failed:", error);
      throw friendly(error, "Could not load the token receipts.");
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<TokenReceiptRecord | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const supabase = await createClient();
    const { data, error } = await supabase.from("token_receipts").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("tokenReceiptService.getById failed:", error);
      throw friendly(error, "Could not load this token receipt.");
    }
    return data ? mapRow(data) : undefined;
  },

  async create(data: TokenReceiptData, propertyId: string | undefined, adminId?: string): Promise<TokenReceiptRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("token_receipts")
      .insert({ ...columnsFor(data), property_id: propertyId || null, created_by: adminId || null })
      .select("*")
      .single();
    if (error) {
      console.error("tokenReceiptService.create failed:", error);
      throw friendly(error, "Could not save this token receipt.");
    }
    return mapRow(row);
  },

  async update(id: string, data: TokenReceiptData): Promise<TokenReceiptRecord> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("token_receipts")
      .update({ ...columnsFor(data), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("tokenReceiptService.update failed:", error);
      throw friendly(error, "Could not save this token receipt.");
    }
    return mapRow(row);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("token_receipts").delete().eq("id", id);
    if (error) {
      console.error("tokenReceiptService.remove failed:", error);
      throw new Error("Could not delete this token receipt.");
    }
  },
};
