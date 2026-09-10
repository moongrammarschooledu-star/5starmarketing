"use server";

import { propertyService } from "@/services/propertyService";
import { searchAnalyticsService } from "@/services/searchAnalyticsService";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";
import type { SearchEventType } from "@/lib/models/searchAnalytics";

// Callable from the client for interactive re-searches (filter changes,
// pagination, map bounds) without a full page navigation. The page's
// own initial render still goes straight through propertyService.search
// server-side — this action exists for everything after that.
export async function searchPropertiesAction(filters: PropertySearchFilters) {
  return propertyService.search(filters);
}

export async function searchPropertiesForMapAction(filters: PropertySearchFilters) {
  return propertyService.searchForMap(filters);
}

export async function listDistinctAmenitiesAction() {
  return propertyService.listDistinctAmenities();
}

export async function listDistinctCitiesAction() {
  return propertyService.listDistinctCities();
}

// Best-effort, anonymous-safe search/map UX analytics (section 41).
// Never throws back to the caller — a tracking failure must never break
// the search experience it's describing.
export async function recordSearchEventAction(
  eventType: SearchEventType,
  opts: { query?: string; filters?: PropertySearchFilters; propertyId?: string; sessionId?: string; customerId?: string }
) {
  try {
    await searchAnalyticsService.record(eventType, opts);
  } catch (e) {
    console.error("recordSearchEventAction failed:", e);
  }
}
