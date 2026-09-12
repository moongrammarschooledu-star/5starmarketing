import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Property, PropertyInput, PropertyType, Purpose, PaymentOption, PropertyStatus } from "@/lib/models/property";
import type { PropertySearchFilters, PropertySearchResult } from "@/lib/models/propertySearch";
import { DEFAULT_PAGE_SIZE } from "@/lib/models/propertySearch";
import {
  resolveStorageImages,
  deleteStorageImages,
  resolveStorageDocuments,
  deleteStorageDocuments,
  type StoredDocument,
} from "./storage";
import { propertyPriceHistoryService } from "./propertyPriceHistoryService";

const BUCKET = "property-images";

// This file is the one place that knows the database's snake_case /
// lowercase enum shape. Every UI component keeps working with the
// friendly "House" / "For Sale" labels defined in lib/models/property.ts.

// Exported for other services (e.g. propertyValuationService's
// comparable search) that need to query `properties.property_type`
// directly by DB value rather than pulling the whole table through
// this file's own mapped methods.
export const TYPE_TO_DB: Record<PropertyType, string> = {
  House: "house",
  Flat: "flat",
  "Residential Plot": "residential_plot",
  "Commercial Property": "commercial",
};
export const TYPE_FROM_DB: Record<string, PropertyType> = {
  house: "House",
  flat: "Flat",
  residential_plot: "Residential Plot",
  commercial: "Commercial Property",
};

const PURPOSE_TO_DB: Record<Purpose, string> = {
  "For Sale": "sale",
  "For Rent": "rent",
  Investment: "investment",
};
const PURPOSE_FROM_DB: Record<string, Purpose> = {
  sale: "For Sale",
  rent: "For Rent",
  investment: "Investment",
};

const PAYMENT_TO_DB: Record<PaymentOption, string> = {
  Cash: "cash",
  Installments: "installments",
  "Cash / Installments": "both",
};
const PAYMENT_FROM_DB: Record<string, PaymentOption> = {
  cash: "Cash",
  installments: "Installments",
  both: "Cash / Installments",
};

const STATUS_TO_DB: Record<PropertyStatus, string> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Inactive: "inactive",
};
const STATUS_FROM_DB: Record<string, PropertyStatus> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  inactive: "Inactive",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToProperty(row: any): Property {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: TYPE_FROM_DB[row.property_type] ?? "House",
    purpose: PURPOSE_FROM_DB[row.purpose] ?? "For Sale",
    location: row.location,
    locationArea: row.location_area ?? "Other Locations",
    city: row.city ?? "Lahore",
    size: row.size,
    sizeCategory: row.size_category ?? "Custom",
    sizeSqft: row.size_sqft ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    price: row.price,
    priceValue: row.price_value ?? undefined,
    paymentOption: PAYMENT_FROM_DB[row.payment_option] ?? "Cash",
    status: STATUS_FROM_DB[row.status] ?? "Available",
    featured: row.featured,
    images: row.images ?? [],
    description: row.description ?? "",
    features: row.features ?? [],
    amenities: row.amenities ?? [],
    mapsQuery: row.maps_url ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    projectId: row.project_id ?? undefined,
    paymentPlan: {
      totalPrice: row.payment_total_price ?? undefined,
      downPayment: row.payment_down_payment ?? undefined,
      monthlyInstallment: row.payment_monthly_installment ?? undefined,
      durationMonths: row.payment_duration_months ?? undefined,
      installmentsCount: row.payment_installments_count ?? undefined,
    },
    documents: (row.documents ?? []) as StoredDocument[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPropertyToRow(input: Partial<PropertyInput>) {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.type !== undefined) row.property_type = TYPE_TO_DB[input.type];
  if (input.purpose !== undefined) row.purpose = PURPOSE_TO_DB[input.purpose];
  if (input.location !== undefined) row.location = input.location;
  if (input.locationArea !== undefined) row.location_area = input.locationArea;
  if (input.city !== undefined) row.city = input.city;
  if (input.size !== undefined) row.size = input.size;
  if (input.sizeCategory !== undefined) row.size_category = input.sizeCategory;
  if (input.sizeSqft !== undefined) row.size_sqft = input.sizeSqft ?? null;
  if (input.bedrooms !== undefined) row.bedrooms = input.bedrooms ?? null;
  if (input.bathrooms !== undefined) row.bathrooms = input.bathrooms ?? null;
  if (input.price !== undefined) row.price = input.price;
  if (input.priceValue !== undefined) row.price_value = input.priceValue ?? null;
  if (input.paymentOption !== undefined) row.payment_option = PAYMENT_TO_DB[input.paymentOption];
  if (input.status !== undefined) row.status = STATUS_TO_DB[input.status];
  if (input.featured !== undefined) row.featured = input.featured;
  if (input.description !== undefined) row.description = input.description;
  if (input.features !== undefined) row.features = input.features;
  if (input.amenities !== undefined) row.amenities = input.amenities;
  if (input.images !== undefined) row.images = input.images;
  if (input.mapsQuery !== undefined) row.maps_url = input.mapsQuery || null;
  if (input.latitude !== undefined) row.latitude = input.latitude ?? null;
  if (input.longitude !== undefined) row.longitude = input.longitude ?? null;
  if (input.projectId !== undefined) row.project_id = input.projectId || null;
  if (input.paymentPlan !== undefined) {
    row.payment_total_price = input.paymentPlan.totalPrice ?? null;
    row.payment_down_payment = input.paymentPlan.downPayment ?? null;
    row.payment_monthly_installment = input.paymentPlan.monthlyInstallment ?? null;
    row.payment_duration_months = input.paymentPlan.durationMonths ?? null;
    row.payment_installments_count = input.paymentPlan.installmentsCount ?? null;
  }
  if (input.documents !== undefined) row.documents = input.documents;
  return row;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "property"
  );
}

/** Kept as a named export for settingsService.ts (logo/favicon reuse the
 *  same bucket) and for backward compatibility with existing imports. */
export async function resolvePropertyImages(images: string[]): Promise<string[]> {
  return resolveStorageImages(images, BUCKET);
}

async function deletePropertyImages(images: string[]) {
  return deleteStorageImages(images, BUCKET);
}

/** Applies every PropertySearchFilters dimension to a Supabase query
 *  builder chain — the single place search/map/popularity-sort all
 *  build their WHERE clause from, so the three code paths can never
 *  silently drift apart. `query` is typed loosely (the builder's
 *  generic return type changes shape with every chained call, which
 *  TypeScript can't express across a reusable function boundary without
 *  a lot of ceremony this internal helper doesn't need). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilteredQuery(query: any, filters: PropertySearchFilters) {
  query = query.neq("status", "inactive");

  if (filters.q) {
    // Escape ilike wildcard characters in user input so a search for
    // "50% off" or "a_b" can't be (mis)read as a wildcard pattern.
    const q = filters.q.replace(/[%_]/g, "\\$&");
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`);
  }
  if (filters.purpose) query = query.eq("purpose", PURPOSE_TO_DB[filters.purpose]);
  if (filters.type) query = query.eq("property_type", TYPE_TO_DB[filters.type]);
  if (filters.city) query = query.ilike("city", filters.city);
  if (filters.area) query = query.ilike("location", `%${filters.area}%`);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.minPrice !== undefined) query = query.gte("price_value", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price_value", filters.maxPrice);
  if (filters.minSize !== undefined) query = query.gte("size_sqft", filters.minSize);
  if (filters.maxSize !== undefined) query = query.lte("size_sqft", filters.maxSize);
  if (filters.bedrooms !== undefined) query = query.gte("bedrooms", filters.bedrooms);
  if (filters.bathrooms !== undefined) query = query.gte("bathrooms", filters.bathrooms);
  if (filters.status) query = query.eq("status", STATUS_TO_DB[filters.status]);
  if (filters.paymentOption) query = query.eq("payment_option", PAYMENT_TO_DB[filters.paymentOption]);
  if (filters.minDownPayment !== undefined) query = query.gte("payment_down_payment", filters.minDownPayment);
  if (filters.maxDownPayment !== undefined) query = query.lte("payment_down_payment", filters.maxDownPayment);
  if (filters.minMonthlyInstallment !== undefined) query = query.gte("payment_monthly_installment", filters.minMonthlyInstallment);
  if (filters.maxMonthlyInstallment !== undefined) query = query.lte("payment_monthly_installment", filters.maxMonthlyInstallment);
  if (filters.featured) query = query.eq("featured", true);
  if (filters.amenities?.length) query = query.contains("amenities", filters.amenities);
  if (filters.bounds) {
    query = query
      .gte("latitude", filters.bounds.south)
      .lte("latitude", filters.bounds.north)
      .gte("longitude", filters.bounds.west)
      .lte("longitude", filters.bounds.east);
  }
  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySort(query: any, sort: PropertySearchFilters["sort"]) {
  switch (sort) {
    case "oldest":
      return query.order("created_at", { ascending: true });
    case "price_asc":
      return query.order("price_value", { ascending: true, nullsFirst: false });
    case "price_desc":
      return query.order("price_value", { ascending: false, nullsFirst: false });
    case "size_asc":
      return query.order("size_sqft", { ascending: true, nullsFirst: false });
    case "size_desc":
      return query.order("size_sqft", { ascending: false, nullsFirst: false });
    case "newest":
    default:
      return query.order("created_at", { ascending: false });
  }
}

/** "Most Viewed"/"Most Inquired" sort (section 15) — real counts from
 *  the property_popularity view (STEP 16 migration), joined in memory
 *  since PostgREST can't order a query by an aggregate from a second
 *  table. Bounded to 500 matching ids so this never becomes an
 *  unbounded full-catalog fetch. */
async function searchByPopularity(filters: PropertySearchFilters, page: number, pageSize: number): Promise<PropertySearchResult> {
  const supabase = await createClient();
  const idQuery = buildFilteredQuery(supabase.from("properties").select("id"), filters).limit(500);
  const { data: idRows, error: idError } = await idQuery;
  if (idError) {
    console.error("propertyService.search (popularity ids) failed:", idError);
    throw new Error("Could not load properties.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ids = (idRows ?? []).map((r: any) => r.id as string);
  if (ids.length === 0) {
    return { properties: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const { data: popularity, error: popError } = await supabase
    .from("property_popularity")
    .select("property_id, view_count, inquiry_count")
    .in("property_id", ids);
  if (popError) {
    console.error("propertyService.search (popularity counts) failed:", popError);
    throw new Error("Could not load properties.");
  }
  const countByProperty = new Map((popularity ?? []).map((r) => [r.property_id as string, r]));
  const metric = filters.sort === "most_inquired" ? "inquiry_count" : "view_count";
  const sortedIds = [...ids].sort((a, b) => {
    const av = (countByProperty.get(a)?.[metric] as number) ?? 0;
    const bv = (countByProperty.get(b)?.[metric] as number) ?? 0;
    return bv - av;
  });

  const total = sortedIds.length;
  const from = (page - 1) * pageSize;
  const pageIds = sortedIds.slice(from, from + pageSize);
  if (pageIds.length === 0) {
    return { properties: [], total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  const { data: rows, error: rowsError } = await supabase.from("properties").select("*").in("id", pageIds);
  if (rowsError) {
    console.error("propertyService.search (popularity rows) failed:", rowsError);
    throw new Error("Could not load properties.");
  }
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  const properties = pageIds.map((id) => byId.get(id)).filter(Boolean).map((r) => mapRowToProperty(r));

  return { properties, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const propertyService = {
  async list(): Promise<Property[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("propertyService.list failed:", error);
      throw new Error("Could not load properties.");
    }
    return (data ?? []).map(mapRowToProperty);
  },

  /** Advanced Property Search (STEP 16) — the ONLY method behind
   *  /properties' filtering/search/sort/pagination. Every filter is
   *  applied server-side via the Supabase query builder (ilike/eq/gte/
   *  lte/contains), never fetch-all-then-filter-in-JS. Only publicly
   *  visible listings (never "Inactive") are ever returned here. */
  async search(filters: PropertySearchFilters): Promise<PropertySearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));

    if (filters.sort === "most_viewed" || filters.sort === "most_inquired") {
      return searchByPopularity(filters, page, pageSize);
    }

    const supabase = await createClient();
    let query = buildFilteredQuery(supabase.from("properties").select("*", { count: "exact" }), filters);
    query = applySort(query, filters.sort);

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("propertyService.search failed:", error);
      throw new Error("Could not load properties.");
    }
    const total = count ?? 0;
    return {
      properties: (data ?? []).map(mapRowToProperty),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Map bounds search (section 26) shares the exact same filter set as
   *  `search`, just capped higher and unpaginated — the map wants every
   *  matching marker in view, not one page of results. */
  async searchForMap(filters: PropertySearchFilters, limit = 500): Promise<Property[]> {
    const supabase = await createClient();
    const query = buildFilteredQuery(supabase.from("properties").select("*"), filters)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(limit);
    const { data, error } = await query;
    if (error) {
      console.error("propertyService.searchForMap failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToProperty);
  },

  /** Distinct amenities actually present across real listings — the
   *  amenities filter is built from this, never a hardcoded wishlist. */
  async listDistinctAmenities(): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("properties").select("amenities").neq("status", "inactive");
    if (error) {
      console.error("propertyService.listDistinctAmenities failed:", error);
      return [];
    }
    const set = new Set<string>();
    for (const row of data ?? []) {
      for (const a of row.amenities ?? []) set.add(a);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  },

  /** Distinct cities actually present — for the City filter dropdown,
   *  never a hardcoded list of cities the business doesn't operate in. */
  async listDistinctCities(): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("properties").select("city").neq("status", "inactive");
    if (error) {
      console.error("propertyService.listDistinctCities failed:", error);
      return [];
    }
    const set = new Set<string>();
    for (const row of data ?? []) if (row.city) set.add(row.city);
    return [...set].sort((a, b) => a.localeCompare(b));
  },

  async listFeatured(limit = 3): Promise<Property[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("featured", true)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("propertyService.listFeatured failed:", error);
      throw new Error("Could not load featured properties.");
    }
    return (data ?? []).map(mapRowToProperty);
  },

  async getById(id: string): Promise<Property | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("propertyService.getById failed:", error);
      throw new Error("Could not load this property.");
    }
    return data ? mapRowToProperty(data) : undefined;
  },

  async getBySlug(slug: string): Promise<Property | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("propertyService.getBySlug failed:", error);
      throw new Error("Could not load this property.");
    }
    return data ? mapRowToProperty(data) : undefined;
  },

  async create(input: PropertyInput): Promise<Property> {
    const supabase = await createClient();
    const images = await resolvePropertyImages(input.images);
    const documents = await resolveStorageDocuments(input.documents ?? []);

    // Ensure a unique slug.
    const base = slugify(input.title);
    let slug = base;
    let n = 1;
    while (true) {
      const { data } = await supabase.from("properties").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${++n}`;
    }

    const row = { ...mapPropertyToRow(input), images, documents, slug };
    const { data, error } = await supabase.from("properties").insert(row).select("*").single();

    if (error) {
      console.error("propertyService.create failed:", error);
      throw new Error("Could not create this property.");
    }
    return mapRowToProperty(data);
  },

  async update(id: string, input: Partial<PropertyInput>): Promise<Property | undefined> {
    const supabase = await createClient();
    const patch = mapPropertyToRow(input);

    if (input.images !== undefined) {
      patch.images = await resolvePropertyImages(input.images);
    }
    if (input.documents !== undefined) {
      patch.documents = await resolveStorageDocuments(input.documents);
    }

    const previousPriceValue = input.priceValue !== undefined ? (await this.getById(id))?.priceValue : undefined;

    const { data, error } = await supabase
      .from("properties")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("propertyService.update failed:", error);
      throw new Error("Could not update this property.");
    }

    // STEP 24 — record a price-history entry whenever the listed price
    // actually changes; best-effort, never blocks this update.
    if (input.priceValue !== undefined && input.priceValue !== previousPriceValue && input.priceValue != null) {
      await propertyPriceHistoryService.record(id, previousPriceValue == null ? "LISTING" : "UPDATED", input.priceValue, "admin_update");
    }

    return data ? mapRowToProperty(data) : undefined;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = await createClient();
    const existing = await this.getById(id);

    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      console.error("propertyService.remove failed:", error);
      throw new Error("Could not delete this property.");
    }

    if (existing) {
      await deletePropertyImages(existing.images);
      await deleteStorageDocuments(existing.documents);
    }
    return true;
  },

  /** Properties belonging to a project — shown as "Available Properties"
   *  on that project's detail page. */
  async listByProject(projectId: string): Promise<Property[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("propertyService.listByProject failed:", error);
      return [];
    }
    return (data ?? []).map(mapRowToProperty);
  },

  /** Up to `limit` other active properties similar to `property` — same
   *  type, location or purpose, and a comparable size. Never includes the
   *  property itself. */
  async listRelated(property: Property, limit = 4): Promise<Property[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .neq("id", property.id)
      .neq("status", "inactive")
      .or(
        [
          `property_type.eq.${TYPE_TO_DB[property.type]}`,
          `location_area.eq.${property.locationArea}`,
          `purpose.eq.${PURPOSE_TO_DB[property.purpose]}`,
          `size_category.eq.${property.sizeCategory}`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("propertyService.listRelated failed:", error);
      return [];
    }

    const candidates = (data ?? []).map(mapRowToProperty);

    // Score by how many attributes match, most-similar first.
    const scored = candidates.map((p) => {
      let score = 0;
      if (p.type === property.type) score += 3;
      if (p.locationArea === property.locationArea) score += 2;
      if (p.purpose === property.purpose) score += 2;
      if (p.sizeCategory === property.sizeCategory) score += 1;
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.p);
  },

  async stats() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("properties").select("status, featured");
    if (error) {
      console.error("propertyService.stats failed:", error);
      throw new Error("Could not load property stats.");
    }
    const rows = data ?? [];
    return {
      total: rows.length,
      available: rows.filter((r) => r.status === "available").length,
      sold: rows.filter((r) => r.status === "sold").length,
      featured: rows.filter((r) => r.featured).length,
    };
  },

  /** Data Quality Check (STEP 9, section 17) — flags real listings that
   *  are missing fields a professional public listing needs. Nothing here
   *  is invented; a property only appears if a required field is
   *  genuinely empty. */
  async dataQualityIssues(): Promise<{ propertyId: string; title: string; missing: string[] }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, description, price, location, images, property_type, status")
      .neq("status", "inactive");
    if (error) {
      console.error("propertyService.dataQualityIssues failed:", error);
      return [];
    }
    const issues: { propertyId: string; title: string; missing: string[] }[] = [];
    for (const r of data ?? []) {
      const missing: string[] = [];
      if (!r.title?.trim()) missing.push("Title");
      if (!r.description?.trim()) missing.push("Description");
      if (!r.price?.trim()) missing.push("Price");
      if (!r.location?.trim()) missing.push("Location");
      if (!r.images || r.images.length === 0) missing.push("Image");
      if (!r.property_type) missing.push("Property Type");
      if (!r.status) missing.push("Status");
      if (missing.length > 0) issues.push({ propertyId: r.id, title: r.title || "Untitled property", missing });
    }
    return issues;
  },
};
