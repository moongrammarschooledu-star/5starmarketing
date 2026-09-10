import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";
import type { SearchEventType, SearchAnalyticsSummary } from "@/lib/models/searchAnalytics";
import type { DateRange } from "@/lib/models/analytics";

const MIN_EVENTS_FOR_SUMMARY = 5;

/** Trims a filter snapshot down to the fields actually worth logging —
 *  never the full object verbatim (keeps rows small, keeps out
 *  anything that could balloon into noise like `page`). */
function filterSnapshot(filters?: PropertySearchFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;
  const snapshot: Record<string, unknown> = {};
  if (filters.purpose) snapshot.purpose = filters.purpose;
  if (filters.type) snapshot.type = filters.type;
  if (filters.city) snapshot.city = filters.city;
  if (filters.area) snapshot.area = filters.area;
  if (filters.minPrice !== undefined) snapshot.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) snapshot.maxPrice = filters.maxPrice;
  if (filters.bedrooms !== undefined) snapshot.bedrooms = filters.bedrooms;
  if (filters.bathrooms !== undefined) snapshot.bathrooms = filters.bathrooms;
  if (filters.status) snapshot.status = filters.status;
  if (filters.sort) snapshot.sort = filters.sort;
  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

export const searchAnalyticsService = {
  async record(
    eventType: SearchEventType,
    opts: { query?: string; filters?: PropertySearchFilters; propertyId?: string; sessionId?: string; customerId?: string }
  ): Promise<void> {
    const supabase = await createClient();
    await supabase.from("search_events").insert({
      event_type: eventType,
      session_id: opts.sessionId || null,
      customer_id: opts.customerId || null,
      property_id: opts.propertyId || null,
      query: opts.query || null,
      filters: filterSnapshot(opts.filters) ?? null,
    });
  },

  /** Admin → Analytics → Property Search (section 42). Every ranking is
   *  built from real `filters` snapshots on `property_search` events —
   *  never invented. Returns hasEnoughData: false (render "No data
   *  available yet.") below a minimum sample size. */
  async summary(range: DateRange): Promise<SearchAnalyticsSummary> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("search_events")
      .select("event_type, filters, property_id")
      .gte("created_at", range.from)
      .lt("created_at", range.to);
    if (error) {
      console.error("searchAnalyticsService.summary failed:", error);
      throw new Error("Could not load search analytics.");
    }
    const rows = data ?? [];
    const searches = rows.filter((r) => r.event_type === "property_search");
    const clicks = rows.filter((r) => r.event_type === "property_result_clicked");
    const mapOpens = rows.filter((r) => r.event_type === "map_opened" || r.event_type === "search_area_clicked");
    const savedSearches = rows.filter((r) => r.event_type === "saved_search_created");

    if (searches.length < MIN_EVENTS_FOR_SUMMARY) {
      return {
        hasEnoughData: false,
        totalSearches: searches.length,
        topLocations: [],
        topPropertyTypes: [],
        saleVsRent: [],
        topPriceRanges: [],
        topBedroomFilters: [],
        mapSearches: mapOpens.length,
        resultClickThroughRate: null,
        savedSearchesCreated: savedSearches.length,
      };
    }

    const tally = (values: string[]) => {
      const map = new Map<string, number>();
      for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (r: any) => (r.filters ?? {}) as Record<string, unknown>;

    const topLocations = tally(
      searches.map((r) => [f(r).city, f(r).area].filter(Boolean).join(" — ")).filter((v): v is string => !!v)
    );
    const topPropertyTypes = tally(searches.map((r) => f(r).type as string).filter(Boolean));
    const saleVsRent = tally(searches.map((r) => f(r).purpose as string).filter(Boolean));
    const topBedroomFilters = tally(
      searches.map((r) => (f(r).bedrooms !== undefined ? `${f(r).bedrooms}+` : undefined)).filter((v): v is string => !!v)
    );

    const priceBuckets = searches
      .map((r) => {
        const min = f(r).minPrice as number | undefined;
        const max = f(r).maxPrice as number | undefined;
        if (min === undefined && max === undefined) return undefined;
        const fmt = (n: number) => (n >= 10000000 ? `${(n / 10000000).toFixed(1)} Cr` : n >= 100000 ? `${(n / 100000).toFixed(0)} Lac` : String(n));
        return `${min !== undefined ? fmt(min) : "Any"} – ${max !== undefined ? fmt(max) : "Any"}`;
      })
      .filter((v): v is string => !!v);
    const topPriceRanges = tally(priceBuckets);

    return {
      hasEnoughData: true,
      totalSearches: searches.length,
      topLocations,
      topPropertyTypes,
      saleVsRent,
      topPriceRanges,
      topBedroomFilters,
      mapSearches: mapOpens.length,
      resultClickThroughRate: searches.length > 0 ? clicks.length / searches.length : null,
      savedSearchesCreated: savedSearches.length,
    };
  },
};
