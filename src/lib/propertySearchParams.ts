import type { PropertyType, Purpose, PropertyStatus, PaymentOption } from "./models/property";
import type { PropertySearchFilters, PropertySortKey, MapBounds } from "./models/propertySearch";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./models/propertySearch";

// Clean, URL-friendly param values — deliberately distinct from the
// internal display labels ("For Sale") and DB values ("sale") so a
// shared search URL stays short and readable either way.
const PURPOSE_PARAM: Record<string, Purpose> = { sale: "For Sale", rent: "For Rent", investment: "Investment" };
const PURPOSE_TO_PARAM: Record<Purpose, string> = { "For Sale": "sale", "For Rent": "rent", Investment: "investment" };

const TYPE_PARAM: Record<string, PropertyType> = {
  house: "House",
  flat: "Flat",
  plot: "Residential Plot",
  commercial: "Commercial Property",
};
const TYPE_TO_PARAM: Record<PropertyType, string> = {
  House: "house",
  Flat: "flat",
  "Residential Plot": "plot",
  "Commercial Property": "commercial",
};

const STATUS_PARAM: Record<string, PropertyStatus> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  inactive: "Inactive",
};
const STATUS_TO_PARAM: Record<PropertyStatus, string> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Inactive: "inactive",
};

const PAYMENT_PARAM: Record<string, PaymentOption> = {
  cash: "Cash",
  installments: "Installments",
  both: "Cash / Installments",
};
const PAYMENT_TO_PARAM: Record<PaymentOption, string> = {
  Cash: "cash",
  Installments: "installments",
  "Cash / Installments": "both",
};

const SORT_KEYS: PropertySortKey[] = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "size_asc",
  "size_desc",
  "most_viewed",
  "most_inquired",
];

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Parses a positive finite number from a query param, clamped to a
 *  sane range — never NaN/Infinity/negative, never throws. Invalid
 *  input (min_price=-100, min_price=abc) silently falls back to
 *  undefined rather than crashing the page. */
function num(v: string | undefined, opts?: { min?: number; max?: number; integer?: boolean }): number | undefined {
  if (!v) return undefined;
  const n = opts?.integer ? parseInt(v, 10) : parseFloat(v);
  if (!Number.isFinite(n)) return undefined;
  let clamped = n;
  if (opts?.min !== undefined) clamped = Math.max(opts.min, clamped);
  if (opts?.max !== undefined) clamped = Math.min(opts.max, clamped);
  return clamped;
}

/** Parses every filter/sort/pagination dimension out of a Next.js
 *  `searchParams` object. Every branch has a safe fallback — an
 *  attacker-crafted or malformed URL degrades to "no filter applied"
 *  for that one field, never a crash, and can never widen visibility
 *  beyond what the underlying Supabase RLS policy already allows (the
 *  search service re-applies real query constraints regardless of what
 *  this function returns). */
export function parsePropertySearchParams(sp: RawSearchParams): PropertySearchFilters {
  const q = one(sp.q)?.trim().slice(0, 200) || undefined;
  const purpose = PURPOSE_PARAM[one(sp.purpose)?.toLowerCase() ?? ""];
  const type = TYPE_PARAM[one(sp.type)?.toLowerCase() ?? ""];
  const status = STATUS_PARAM[one(sp.status)?.toLowerCase() ?? ""];
  const paymentOption = PAYMENT_PARAM[one(sp.payment)?.toLowerCase() ?? ""];
  const city = one(sp.city)?.trim().slice(0, 100) || undefined;
  const area = one(sp.area)?.trim().replace(/-/g, " ").slice(0, 100) || undefined;
  const projectId = one(sp.project)?.trim().slice(0, 100) || undefined;

  const minPrice = num(one(sp.min_price), { min: 0, max: 10_000_000_000 });
  let maxPrice = num(one(sp.max_price), { min: 0, max: 10_000_000_000 });
  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) maxPrice = minPrice;

  const minSize = num(one(sp.min_size), { min: 0, max: 1_000_000 });
  let maxSize = num(one(sp.max_size), { min: 0, max: 1_000_000 });
  if (minSize !== undefined && maxSize !== undefined && maxSize < minSize) maxSize = minSize;

  const bedrooms = num(one(sp.bedrooms), { min: 1, max: 20, integer: true });
  const bathrooms = num(one(sp.bathrooms), { min: 1, max: 20, integer: true });

  const minDownPayment = num(one(sp.min_down), { min: 0, max: 10_000_000_000 });
  const maxDownPayment = num(one(sp.max_down), { min: 0, max: 10_000_000_000 });
  const minMonthlyInstallment = num(one(sp.min_installment), { min: 0, max: 10_000_000_000 });
  const maxMonthlyInstallment = num(one(sp.max_installment), { min: 0, max: 10_000_000_000 });

  const featured = one(sp.featured) === "1" || one(sp.featured) === "true" ? true : undefined;

  const amenitiesRaw = one(sp.amenities);
  const amenities = amenitiesRaw
    ? amenitiesRaw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 20)
    : undefined;

  let bounds: MapBounds | undefined;
  const boundsRaw = one(sp.bounds);
  if (boundsRaw) {
    const parts = boundsRaw.split(",").map(Number);
    if (parts.length === 4 && parts.every((p) => Number.isFinite(p))) {
      const [north, south, east, west] = parts;
      if (north >= -90 && north <= 90 && south >= -90 && south <= 90 && east >= -180 && east <= 180 && west >= -180 && west <= 180) {
        bounds = { north, south, east, west };
      }
    }
  }

  const sortRaw = one(sp.sort);
  const sort = SORT_KEYS.includes(sortRaw as PropertySortKey) ? (sortRaw as PropertySortKey) : undefined;

  const page = Math.max(1, num(one(sp.page), { min: 1, max: 100000, integer: true }) ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, num(one(sp.page_size), { min: 1, max: MAX_PAGE_SIZE, integer: true }) ?? DEFAULT_PAGE_SIZE));

  return {
    q,
    purpose,
    type,
    city,
    area,
    projectId,
    minPrice,
    maxPrice,
    minSize,
    maxSize,
    bedrooms,
    bathrooms,
    status,
    paymentOption,
    minDownPayment,
    maxDownPayment,
    minMonthlyInstallment,
    maxMonthlyInstallment,
    featured,
    amenities,
    bounds,
    sort,
    page,
    pageSize,
  };
}

/** Inverse of parsePropertySearchParams — builds a clean query string
 *  from filters, e.g. for "share this search" links and for updating
 *  the URL client-side without a full page reload. Only ever emits the
 *  named, validated params above — never passes through arbitrary keys. */
export function buildPropertySearchQuery(filters: PropertySearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.purpose) params.set("purpose", PURPOSE_TO_PARAM[filters.purpose]);
  if (filters.type) params.set("type", TYPE_TO_PARAM[filters.type]);
  if (filters.status) params.set("status", STATUS_TO_PARAM[filters.status]);
  if (filters.paymentOption) params.set("payment", PAYMENT_TO_PARAM[filters.paymentOption]);
  if (filters.city) params.set("city", filters.city);
  if (filters.area) params.set("area", filters.area.replace(/\s+/g, "-").toLowerCase());
  if (filters.projectId) params.set("project", filters.projectId);
  if (filters.minPrice !== undefined) params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("max_price", String(filters.maxPrice));
  if (filters.minSize !== undefined) params.set("min_size", String(filters.minSize));
  if (filters.maxSize !== undefined) params.set("max_size", String(filters.maxSize));
  if (filters.bedrooms !== undefined) params.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms !== undefined) params.set("bathrooms", String(filters.bathrooms));
  if (filters.minDownPayment !== undefined) params.set("min_down", String(filters.minDownPayment));
  if (filters.maxDownPayment !== undefined) params.set("max_down", String(filters.maxDownPayment));
  if (filters.minMonthlyInstallment !== undefined) params.set("min_installment", String(filters.minMonthlyInstallment));
  if (filters.maxMonthlyInstallment !== undefined) params.set("max_installment", String(filters.maxMonthlyInstallment));
  if (filters.featured) params.set("featured", "1");
  if (filters.amenities?.length) params.set("amenities", filters.amenities.join(","));
  if (filters.bounds) params.set("bounds", `${filters.bounds.north},${filters.bounds.south},${filters.bounds.east},${filters.bounds.west}`);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** True when the URL carries enough distinct filters that it's a
 *  "long-tail" combination rather than a curated landing page — used to
 *  decide noindex vs index (section 39/40). Bounds/page/sort never
 *  count toward this since they don't change the SEO-relevant subject. */
export function isDeepFilterCombination(filters: PropertySearchFilters): boolean {
  const significant = [
    filters.q,
    filters.type,
    filters.city,
    filters.area,
    filters.projectId,
    filters.minPrice,
    filters.maxPrice,
    filters.minSize,
    filters.maxSize,
    filters.bedrooms,
    filters.bathrooms,
    filters.status,
    filters.paymentOption,
    filters.featured,
    filters.amenities?.length,
  ].filter((v) => v !== undefined && v !== false).length;
  return significant > 2;
}
