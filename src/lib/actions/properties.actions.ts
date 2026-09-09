"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { propertyService } from "@/services/propertyService";
import type {
  PaymentOption,
  Property,
  PropertyStatus,
  PropertyType,
  Purpose,
  LocationArea,
  SizeCategory,
} from "@/lib/models/property";

function revalidateAll(slug?: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath("/");
  if (slug) revalidatePath(`/properties/${slug}`);
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function buildInputFromForm(formData: FormData) {
  const images = formData
    .getAll("images")
    .map((v) => String(v))
    .filter(Boolean);

  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const amenities = String(formData.get("amenities") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const priceValueRaw = String(formData.get("priceValue") ?? "").trim();

  const numOrUndefined = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw ? Number(raw) : undefined;
  };

  const documents = formData
    .getAll("documents")
    .map((v) => {
      try {
        const parsed = JSON.parse(String(v));
        return { name: String(parsed.name ?? ""), url: String(parsed.url ?? "") };
      } catch {
        return null;
      }
    })
    .filter((d): d is { name: string; url: string } => !!d && !!d.name && !!d.url);

  const projectId = String(formData.get("projectId") ?? "").trim();

  return {
    projectId: projectId || undefined,
    paymentPlan: {
      totalPrice: numOrUndefined("paymentTotalPrice"),
      downPayment: numOrUndefined("paymentDownPayment"),
      monthlyInstallment: numOrUndefined("paymentMonthlyInstallment"),
      durationMonths: numOrUndefined("paymentDurationMonths"),
      installmentsCount: numOrUndefined("paymentInstallmentsCount"),
    },
    documents,
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type")) as PropertyType,
    purpose: String(formData.get("purpose")) as Purpose,
    location: String(formData.get("location") ?? "").trim(),
    mapsQuery: String(formData.get("mapsQuery") ?? "").trim() || undefined,
    locationArea: String(formData.get("locationArea")) as LocationArea,
    size: String(formData.get("size") ?? "").trim(),
    sizeCategory: String(formData.get("sizeCategory")) as SizeCategory,
    price: String(formData.get("price") ?? "").trim(),
    priceValue: priceValueRaw ? Number(priceValueRaw) : undefined,
    paymentOption: String(formData.get("paymentOption")) as PaymentOption,
    status: String(formData.get("status")) as PropertyStatus,
    featured: formData.get("featured") === "on",
    description: String(formData.get("description") ?? "").trim(),
    features,
    amenities,
    images: images.length
      ? images
      : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"],
  };
}

export interface PropertyFormState {
  error?: string;
}

export async function createPropertyAction(
  _prevState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const input = buildInputFromForm(formData);
  if (!input.title) return { error: "Property title is required." };

  let property;
  try {
    property = await propertyService.create(input);
  } catch (e) {
    return { error: errorMessage(e, "Could not create this property. Please try again.") };
  }

  revalidateAll(property.slug);
  redirect("/admin/properties");
}

export async function updatePropertyAction(
  id: string,
  _prevState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const input = buildInputFromForm(formData);
  if (!input.title) return { error: "Property title is required." };

  let updated;
  try {
    updated = await propertyService.update(id, input);
  } catch (e) {
    return { error: errorMessage(e, "Could not update this property. Please try again.") };
  }
  if (!updated) return { error: "Property not found." };

  revalidateAll(updated.slug);
  redirect("/admin/properties");
}

export async function deletePropertyAction(id: string) {
  try {
    await propertyService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deletePropertyAction failed:", e);
  }
}

export async function toggleFeaturedAction(id: string) {
  try {
    const property = await propertyService.getById(id);
    if (!property) return;
    await propertyService.update(id, { featured: !property.featured });
    revalidateAll(property.slug);
  } catch (e) {
    console.error("toggleFeaturedAction failed:", e);
  }
}

export async function changeStatusAction(id: string, status: Property["status"]) {
  try {
    const updated = await propertyService.update(id, { status });
    revalidateAll(updated?.slug);
  } catch (e) {
    console.error("changeStatusAction failed:", e);
  }
}
