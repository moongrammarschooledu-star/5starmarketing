import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TYPE_FROM_DB, TYPE_TO_DB } from "./propertyService";
import { contactSources, type ContactInput, type ContactPurpose, type ContactSource, type CustomerContact } from "@/lib/models/contact";

const PURPOSE_TO_DB: Record<ContactPurpose, string> = { "For Sale": "sale", "For Rent": "rent" };
const PURPOSE_FROM_DB: Record<string, ContactPurpose> = { sale: "For Sale", rent: "For Rent" };
const MAX_ROWS = 3000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CustomerContact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    propertyDetail: row.property_detail ?? undefined,
    remarks: row.remarks ?? undefined,
    source: (contactSources as readonly string[]).includes(row.source) ? (row.source as ContactSource) : "Other",
    purpose: row.purpose ? PURPOSE_FROM_DB[row.purpose] : undefined,
    propertyType: row.property_type ? TYPE_FROM_DB[row.property_type] : undefined,
    area: row.area ?? undefined,
    budgetMax: row.budget_max != null ? Number(row.budget_max) : undefined,
    sizeMarla: row.size_marla != null ? Number(row.size_marla) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: ContactInput) {
  return {
    name: input.name,
    phone: input.phone,
    whatsapp: input.whatsapp ?? null,
    property_detail: input.propertyDetail ?? null,
    remarks: input.remarks ?? null,
    source: input.source,
    purpose: input.purpose ? PURPOSE_TO_DB[input.purpose] : null,
    property_type: input.propertyType ? TYPE_TO_DB[input.propertyType] : null,
    area: input.area ?? null,
    budget_max: input.budgetMax ?? null,
    size_marla: input.sizeMarla ?? null,
  };
}

export const contactService = {
  async list(): Promise<CustomerContact[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("customer_contacts").select("*").order("created_at", { ascending: false }).limit(MAX_ROWS);
    if (error) {
      console.error("contactService.list failed:", error);
      throw new Error(
        error.code === "42P01" || /does not exist|schema cache/i.test(error.message)
          ? "The contacts table is not set up in the database yet."
          : "Could not load the contacts.",
      );
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: ContactInput, adminId?: string): Promise<CustomerContact> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_contacts")
      .insert({ ...toRow(input), created_by: adminId ?? null })
      .select("*")
      .single();
    if (error) {
      console.error("contactService.create failed:", error);
      throw new Error("Could not save this contact.");
    }
    return mapRow(data);
  },

  async update(id: string, input: ContactInput): Promise<CustomerContact | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_contacts")
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("contactService.update failed:", error);
      throw new Error("Could not update this contact.");
    }
    return data ? mapRow(data) : undefined;
  },

  async getById(id: string): Promise<CustomerContact | undefined> {
    const supabase = await createClient();
    const { data } = await supabase.from("customer_contacts").select("*").eq("id", id).maybeSingle();
    return data ? mapRow(data) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("customer_contacts").delete().eq("id", id);
    if (error) {
      console.error("contactService.remove failed:", error);
      throw new Error("Could not delete this contact.");
    }
  },
};
