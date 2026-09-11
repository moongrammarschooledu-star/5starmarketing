import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MarketingTag, MarketingTagInput } from "@/lib/models/marketingTag";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MarketingTag {
  return { id: row.id, name: row.name, color: row.color ?? undefined, createdAt: row.created_at };
}

export const marketingTagService = {
  async list(): Promise<MarketingTag[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_tags").select("*").order("name", { ascending: true });
    if (error) {
      console.error("marketingTagService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: MarketingTagInput): Promise<MarketingTag> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_tags").insert({ name: input.name, color: input.color || null }).select("*").single();
    if (error) {
      if (error.code === "23505") throw new Error("A tag with this name already exists.");
      throw new Error("Could not create this tag.");
    }
    return mapRow(data);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_tags").delete().eq("id", id);
    if (error) throw new Error("Could not delete this tag.");
  },

  async listForLead(leadId: string): Promise<MarketingTag[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lead_tags").select("marketing_tags(*)").eq("lead_id", leadId);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => row.marketing_tags).filter(Boolean).map(mapRow);
  },

  async addToLead(leadId: string, tagId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("lead_tags").insert({ lead_id: leadId, tag_id: tagId });
    if (error && error.code !== "23505") throw new Error("Could not add this tag.");
  },

  async removeFromLead(leadId: string, tagId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("lead_tags").delete().eq("lead_id", leadId).eq("tag_id", tagId);
    if (error) throw new Error("Could not remove this tag.");
  },

  async findByName(name: string): Promise<MarketingTag | undefined> {
    const supabase = await createClient();
    const { data } = await supabase.from("marketing_tags").select("*").ilike("name", name).maybeSingle();
    return data ? mapRow(data) : undefined;
  },
};
