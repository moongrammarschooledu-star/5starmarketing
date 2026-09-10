export const searchEventTypes = [
  "property_search",
  "filter_applied",
  "filter_removed",
  "sort_changed",
  "map_opened",
  "map_marker_clicked",
  "search_area_clicked",
  "property_result_clicked",
  "favorite_from_search",
  "compare_from_search",
  "saved_search_created",
] as const;

export type SearchEventType = (typeof searchEventTypes)[number];

export interface SearchEventEntry {
  id: string;
  eventType: SearchEventType;
  sessionId?: string;
  customerId?: string;
  propertyId?: string;
  query?: string;
  filters?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
}

/** Real, from-data-only aggregate for the admin Search Analytics page.
 *  Every count/list comes straight from `search_events`; when a given
 *  slice has fewer than a handful of events, callers should show "No
 *  data available yet." rather than a near-meaningless ranking. */
export interface SearchAnalyticsSummary {
  hasEnoughData: boolean;
  totalSearches: number;
  topLocations: { label: string; count: number }[];
  topPropertyTypes: { label: string; count: number }[];
  saleVsRent: { label: string; count: number }[];
  topPriceRanges: { label: string; count: number }[];
  topBedroomFilters: { label: string; count: number }[];
  mapSearches: number;
  resultClickThroughRate: number | null;
  savedSearchesCreated: number;
}
