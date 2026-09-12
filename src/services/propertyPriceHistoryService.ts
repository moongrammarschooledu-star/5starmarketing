import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyPriceHistoryEntry, PropertyPriceType } from "@/lib/models/investment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyPriceHistoryEntry {
  return {
    id: row.id,
    propertyId: row.property_id,
    priceType: row.price_type,
    price: Number(row.price),
    source: row.source ?? undefined,
    dealId: row.deal_id ?? undefined,
    recordedAt: row.recorded_at,
    createdByName: row.admin_profiles?.name ?? undefined,
  };
}

export const propertyPriceHistoryService = {
  async listByProperty(propertyId: string): Promise<PropertyPriceHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_price_history").select("*, admin_profiles(name)").eq("property_id", propertyId).order("recorded_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** Best-effort — called from propertyService.update() (LISTING/
   *  UPDATED) and dealService's status transitions (BOOKING/
   *  TRANSACTION). Never blocks the calling flow (section 22
   *  integration must not break existing property/deal updates). */
  async record(propertyId: string, priceType: PropertyPriceType, price: number, source?: string, dealId?: string, actorId?: string): Promise<void> {
    if (!Number.isFinite(price) || price < 0) return;
    try {
      const supabase = await createClient();
      await supabase.from("property_price_history").insert({
        property_id: propertyId,
        price_type: priceType,
        price,
        source: source || null,
        deal_id: dealId || null,
        created_by: actorId || null,
      });
    } catch (e) {
      console.error("propertyPriceHistoryService.record failed:", e);
    }
  },
};
