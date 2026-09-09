import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Property, PropertyInput, PropertyType, Purpose, PaymentOption, PropertyStatus } from "@/lib/models/property";
import {
  resolveStorageImages,
  deleteStorageImages,
  resolveStorageDocuments,
  deleteStorageDocuments,
  type StoredDocument,
} from "./storage";

const BUCKET = "property-images";

// This file is the one place that knows the database's snake_case /
// lowercase enum shape. Every UI component keeps working with the
// friendly "House" / "For Sale" labels defined in lib/models/property.ts.

const TYPE_TO_DB: Record<PropertyType, string> = {
  House: "house",
  Flat: "flat",
  "Residential Plot": "residential_plot",
  "Commercial Property": "commercial",
};
const TYPE_FROM_DB: Record<string, PropertyType> = {
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
    size: row.size,
    sizeCategory: row.size_category ?? "Custom",
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
  if (input.size !== undefined) row.size = input.size;
  if (input.sizeCategory !== undefined) row.size_category = input.sizeCategory;
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
};
