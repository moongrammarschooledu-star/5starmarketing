import type { Property, PropertyType, Purpose, PropertyStatus, PaymentOption } from "./property";

export type PropertySortKey =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "size_asc"
  | "size_desc"
  | "most_viewed"
  | "most_inquired";

export const propertySortOptions: { key: PropertySortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "size_asc", label: "Size: Small to Large" },
  { key: "size_desc", label: "Size: Large to Small" },
  { key: "most_viewed", label: "Most Viewed" },
  { key: "most_inquired", label: "Most Inquired" },
];

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** The one shape every layer (URL parsing, the search service, saved
 *  searches, search-analytics logging) agrees on. Every field is
 *  optional — an empty object means "no filters, show everything." */
export interface PropertySearchFilters {
  q?: string;
  purpose?: Purpose;
  type?: PropertyType;
  city?: string;
  /** Free-text match against `location` (and `title`) — the closest
   *  thing this data model has to a locality/area field. */
  area?: string;
  projectId?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  /** "N+" semantics — 3 means "3 or more". */
  bedrooms?: number;
  bathrooms?: number;
  status?: PropertyStatus;
  paymentOption?: PaymentOption;
  minDownPayment?: number;
  maxDownPayment?: number;
  minMonthlyInstallment?: number;
  maxMonthlyInstallment?: number;
  featured?: boolean;
  amenities?: string[];
  bounds?: MapBounds;
  sort?: PropertySortKey;
  page?: number;
  pageSize?: number;
}

export interface PropertySearchResult {
  properties: Property[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 48;

/** One entry per filter that can produce a removable chip in the UI —
 *  built from a PropertySearchFilters + a human label, not from raw
 *  query strings, so the chip text always matches real applied state. */
export interface ActiveFilterChip {
  key: keyof PropertySearchFilters | `amenity:${string}`;
  label: string;
}
