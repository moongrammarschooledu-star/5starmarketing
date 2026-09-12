import "server-only";
import { createClient } from "@/lib/supabase/server";
import { investmentAuditService } from "./investmentAuditService";
import type { MarketData, MarketDataInput, MarketDataStatus } from "@/lib/models/investment";

const SELECT = "*, created:admin_profiles!market_data_created_by_fkey(name), updated:admin_profiles!market_data_updated_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MarketData {
  return {
    id: row.id,
    location: row.location,
    propertyType: row.property_type ?? undefined,
    periodStart: row.period_start ?? undefined,
    periodEnd: row.period_end ?? undefined,
    averagePrice: row.average_price != null ? Number(row.average_price) : undefined,
    minPrice: row.min_price != null ? Number(row.min_price) : undefined,
    maxPrice: row.max_price != null ? Number(row.max_price) : undefined,
    pricePerMarla: row.price_per_marla != null ? Number(row.price_per_marla) : undefined,
    pricePerSqft: row.price_per_sqft != null ? Number(row.price_per_sqft) : undefined,
    averageRent: row.average_rent != null ? Number(row.average_rent) : undefined,
    rentalYield: row.rental_yield != null ? Number(row.rental_yield) : undefined,
    appreciationRate: row.appreciation_rate != null ? Number(row.appreciation_rate) : undefined,
    dataSource: row.data_source ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    dataDate: row.data_date,
    status: row.status,
    confidenceLevel: row.confidence_level ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const marketDataService = {
  async list(filters?: { location?: string; propertyType?: string; status?: MarketDataStatus }): Promise<MarketData[]> {
    const supabase = await createClient();
    let query = supabase.from("market_data").select(SELECT).order("data_date", { ascending: false });
    if (filters?.location) query = query.ilike("location", `%${filters.location}%`);
    if (filters?.propertyType) query = query.eq("property_type", filters.propertyType);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MarketData | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("market_data").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** The most recent VERIFIED record for a location/type — the only
   *  data this module's public-facing "market comparison" figures may
   *  ever use (section 7's "only VERIFIED data should be used for
   *  official market intelligence"). */
  async latestVerified(location: string, propertyType?: string): Promise<MarketData | undefined> {
    const supabase = await createClient();
    let query = supabase.from("market_data").select(SELECT).eq("status", "VERIFIED").ilike("location", `%${location}%`).order("data_date", { ascending: false }).limit(1);
    if (propertyType) query = query.eq("property_type", propertyType);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MarketDataInput, actorId: string, actorName: string): Promise<MarketData> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("market_data")
      .insert({
        location: input.location,
        property_type: input.propertyType || null,
        period_start: input.periodStart || null,
        period_end: input.periodEnd || null,
        average_price: input.averagePrice ?? null,
        min_price: input.minPrice ?? null,
        max_price: input.maxPrice ?? null,
        price_per_marla: input.pricePerMarla ?? null,
        price_per_sqft: input.pricePerSqft ?? null,
        average_rent: input.averageRent ?? null,
        rental_yield: input.rentalYield ?? null,
        appreciation_rate: input.appreciationRate ?? null,
        data_source: input.dataSource || null,
        source_url: input.sourceUrl || null,
        data_date: input.dataDate,
        confidence_level: input.confidenceLevel || null,
        notes: input.notes || null,
        created_by: actorId,
        updated_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("marketDataService.create failed:", error);
      throw new Error("Could not create this market data record.");
    }
    const record = mapRow(data);
    await investmentAuditService.log({ entityType: "market_data", entityId: record.id, action: "Created", actorId, actorName, newValue: { location: record.location, status: record.status } });
    return record;
  },

  async update(id: string, input: Partial<MarketDataInput>, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { updated_by: actorId };
    if (input.location !== undefined) row.location = input.location;
    if (input.propertyType !== undefined) row.property_type = input.propertyType || null;
    if (input.periodStart !== undefined) row.period_start = input.periodStart || null;
    if (input.periodEnd !== undefined) row.period_end = input.periodEnd || null;
    if (input.averagePrice !== undefined) row.average_price = input.averagePrice;
    if (input.minPrice !== undefined) row.min_price = input.minPrice;
    if (input.maxPrice !== undefined) row.max_price = input.maxPrice;
    if (input.pricePerMarla !== undefined) row.price_per_marla = input.pricePerMarla;
    if (input.pricePerSqft !== undefined) row.price_per_sqft = input.pricePerSqft;
    if (input.averageRent !== undefined) row.average_rent = input.averageRent;
    if (input.rentalYield !== undefined) row.rental_yield = input.rentalYield;
    if (input.appreciationRate !== undefined) row.appreciation_rate = input.appreciationRate;
    if (input.dataSource !== undefined) row.data_source = input.dataSource || null;
    if (input.sourceUrl !== undefined) row.source_url = input.sourceUrl || null;
    if (input.dataDate !== undefined) row.data_date = input.dataDate;
    if (input.confidenceLevel !== undefined) row.confidence_level = input.confidenceLevel || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("market_data").update(row).eq("id", id);
    if (error) throw new Error("Could not update this market data record.");
    await investmentAuditService.log({ entityType: "market_data", entityId: id, action: "Updated", actorId, actorName });
  },

  async setStatus(id: string, status: MarketDataStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("market_data").update({ status, updated_by: actorId }).eq("id", id);
    if (error) throw new Error("Could not update this record's status.");
    await investmentAuditService.log({ entityType: "market_data", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },
};
