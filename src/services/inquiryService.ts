import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Inquiry, InquiryInput, LeadStatus, LeadSource } from "@/lib/models/inquiry";

const STATUS_TO_DB: Record<LeadStatus, string> = {
  New: "new",
  Contacted: "contacted",
  "Follow-up": "follow_up",
  Closed: "closed",
};
const STATUS_FROM_DB: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  closed: "Closed",
};

const SOURCE_TO_DB: Record<LeadSource, string> = {
  Website: "website",
  WhatsApp: "whatsapp",
  "Contact Form": "contact_form",
};
const SOURCE_FROM_DB: Record<string, LeadSource> = {
  website: "Website",
  whatsapp: "WhatsApp",
  contact_form: "Contact Form",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToInquiry(row: any): Inquiry {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.property_title ?? undefined,
    message: row.message,
    source: SOURCE_FROM_DB[row.source] ?? "Website",
    status: STATUS_FROM_DB[row.status] ?? "New",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const inquiryService = {
  async list(): Promise<Inquiry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("inquiryService.list failed:", error);
      throw new Error("Could not load inquiries.");
    }
    return (data ?? []).map(mapRowToInquiry);
  },

  async listRecent(limit = 5): Promise<Inquiry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("inquiryService.listRecent failed:", error);
      throw new Error("Could not load inquiries.");
    }
    return (data ?? []).map(mapRowToInquiry);
  },

  /** Used by the public contact form / WhatsApp buttons — must work for an
   *  anonymous visitor, so this uses the same cookie-bound client (RLS's
   *  "inquiries_public_insert" policy allows anon inserts). */
  async create(input: InquiryInput): Promise<Inquiry> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inquiries")
      .insert({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        property_id: input.propertyId || null,
        property_title: input.propertyTitle || null,
        message: input.message,
        source: SOURCE_TO_DB[input.source],
        status: STATUS_TO_DB[input.status ?? "New"],
      })
      .select("*")
      .single();

    if (error) {
      console.error("inquiryService.create failed:", error);
      throw new Error("Could not submit your inquiry. Please try again or use WhatsApp.");
    }
    return mapRowToInquiry(data);
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Inquiry | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inquiries")
      .update({ status: STATUS_TO_DB[status] })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("inquiryService.updateStatus failed:", error);
      throw new Error("Could not update this inquiry.");
    }
    return data ? mapRowToInquiry(data) : undefined;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("inquiries").delete().eq("id", id);
    if (error) {
      console.error("inquiryService.remove failed:", error);
      throw new Error("Could not delete this inquiry.");
    }
    return true;
  },

  async stats() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("inquiries").select("status");
    if (error) {
      console.error("inquiryService.stats failed:", error);
      throw new Error("Could not load inquiry stats.");
    }
    const rows = data ?? [];
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === "new").length,
    };
  },
};
