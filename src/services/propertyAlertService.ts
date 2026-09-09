import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyAlert, PropertyAlertInput } from "@/lib/models/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyAlert {
  return {
    id: row.id,
    userId: row.user_id,
    propertyType: row.property_type ?? undefined,
    location: row.location ?? undefined,
    minPrice: row.min_price ?? undefined,
    maxPrice: row.max_price ?? undefined,
    purpose: row.purpose ?? undefined,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const propertyAlertService = {
  async list(userId: string): Promise<PropertyAlert[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("propertyAlertService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(userId: string, input: PropertyAlertInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_alerts").insert({
      user_id: userId,
      property_type: input.propertyType || null,
      location: input.location || null,
      min_price: input.minPrice ?? null,
      max_price: input.maxPrice ?? null,
      purpose: input.purpose || null,
      enabled: input.enabled,
    });
    if (error) {
      console.error("propertyAlertService.create failed:", error);
      throw new Error("Could not save this alert.");
    }
  },

  async toggle(id: string, enabled: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_alerts").update({ enabled }).eq("id", id);
    if (error) throw new Error("Could not update this alert.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_alerts").delete().eq("id", id);
    if (error) throw new Error("Could not delete this alert.");
  },
};
