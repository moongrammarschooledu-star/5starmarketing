import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SavedSearch, SavedSearchInput } from "@/lib/models/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SavedSearch {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    propertyType: row.property_type ?? undefined,
    location: row.location ?? undefined,
    sizeCategory: row.size_category ?? undefined,
    purpose: row.purpose ?? undefined,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const savedSearchService = {
  async list(userId: string): Promise<SavedSearch[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("savedSearchService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(userId: string, input: SavedSearchInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId,
      name: input.name,
      property_type: input.propertyType || null,
      location: input.location || null,
      size_category: input.sizeCategory || null,
      purpose: input.purpose || null,
      enabled: input.enabled,
    });
    if (error) {
      console.error("savedSearchService.create failed:", error);
      throw new Error("Could not save this search.");
    }
  },

  async toggle(id: string, enabled: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("saved_searches").update({ enabled }).eq("id", id);
    if (error) throw new Error("Could not update this search.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) throw new Error("Could not delete this search.");
  },
};
