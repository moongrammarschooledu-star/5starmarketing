import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/models/property";
import { propertyService } from "./propertyService";

export const favoritesService = {
  /** Full favorited Property rows for the given customer, newest first —
   *  used by /customer/favorites. Properties that were since deleted are
   *  silently skipped (their favorite row cascades away in the DB too). */
  async listProperties(userId: string): Promise<Property[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("favoritesService.listProperties failed:", error);
      return [];
    }
    const ids = (data ?? []).map((r) => r.property_id);
    if (ids.length === 0) return [];
    const properties = await Promise.all(ids.map((id) => propertyService.getById(id)));
    return properties.filter((p): p is Property => !!p);
  },

  /** Just the ids — used to render the filled/outline heart state on
   *  every property card without fetching full property rows. */
  async listPropertyIds(userId: string): Promise<Set<string>> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("favorites").select("property_id").eq("user_id", userId);
    if (error) return new Set();
    return new Set((data ?? []).map((r) => r.property_id));
  },

  async count(userId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return 0;
    return count ?? 0;
  },

  /** Insert-or-ignore — the unique(user_id, property_id) constraint is
   *  what actually prevents a duplicate; a conflict here just means it
   *  was already saved, which isn't an error from the caller's view. */
  async add(userId: string, propertyId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, property_id: propertyId });
    if (error && error.code !== "23505") {
      console.error("favoritesService.add failed:", error);
      throw new Error("Could not save this property.");
    }
  },

  async remove(userId: string, propertyId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);
    if (error) {
      console.error("favoritesService.remove failed:", error);
      throw new Error("Could not remove this property.");
    }
  },
};
