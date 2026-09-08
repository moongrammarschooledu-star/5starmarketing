import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Property, PropertyInput, PropertyType, Purpose, PaymentOption, PropertyStatus } from "@/lib/models/property";

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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Property images arrive from the form either as hosted https:// URLs
 * (pasted by the admin) or as data: URIs (the browser-side preview from a
 * file upload). This uploads the data: URIs to the property-images bucket
 * and returns the final list of URLs to store, validating type/size along
 * the way so we never store or serve something unexpected.
 */
export async function resolvePropertyImages(images: string[]): Promise<string[]> {
  const supabase = await createClient();
  const resolved: string[] = [];

  for (const image of images) {
    if (!image.startsWith("data:")) {
      resolved.push(image);
      continue;
    }

    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const [, mimeType, base64] = match;

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}. Use JPEG, PNG, WEBP or GIF.`);
    }

    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("One of the uploaded images is larger than 5MB.");
    }

    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("property-images")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (error) {
      console.error("Supabase storage upload failed:", error);
      throw new Error("Could not upload one of the images. Please try again.");
    }

    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    resolved.push(data.publicUrl);
  }

  return resolved;
}

/** Deletes a property's images from Storage. Best-effort — a failure here
 *  shouldn't block the record deletion the caller is doing. */
async function deletePropertyImages(images: string[]) {
  const paths = images
    .map((url) => url.split("/property-images/")[1])
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.storage.from("property-images").remove(paths);
  if (error) console.error("Failed to delete property images from storage:", error);
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

    // Ensure a unique slug.
    const base = slugify(input.title);
    let slug = base;
    let n = 1;
    while (true) {
      const { data } = await supabase.from("properties").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${++n}`;
    }

    const row = { ...mapPropertyToRow(input), images, slug };
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

    if (existing) await deletePropertyImages(existing.images);
    return true;
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
