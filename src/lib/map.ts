/** Map provider architecture (STEP 16, section 22/58) — configurable via
 *  NEXT_PUBLIC_MAP_PROVIDER, defaulting to "osm" (Leaflet + OpenStreetMap
 *  tiles, no API key/billing required — nothing in this project has a
 *  Google Maps or Mapbox key configured, and OSM is production-ready for
 *  a single-country listings site). Switching to "google"/"mapbox" later
 *  means implementing that provider's tile/marker layer behind this same
 *  MapView component contract and reading its own NEXT_PUBLIC_* key —
 *  nothing else in the app needs to change. */
export type MapProvider = "osm" | "google" | "mapbox";

export function getMapProvider(): MapProvider {
  const configured = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  if (configured === "google" || configured === "mapbox") return configured;
  return "osm";
}

/** Lahore's city centroid — used ONLY as an initial map camera position
 *  when no business coordinate is configured in Website Settings and no
 *  search/user location is active. This is a well-known public fact
 *  about where the city is, never attributed to any property or used as
 *  a marker. */
export const FALLBACK_MAP_CENTER = { latitude: 31.5204, longitude: 74.3587 };
export const DEFAULT_MAP_ZOOM = 12;
