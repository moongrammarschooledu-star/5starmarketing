"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import type {
  PaymentOption,
  Property,
  PropertyStatus,
  PropertyType,
  Purpose,
  LocationArea,
  SizeCategory,
} from "@/lib/models/property";

function revalidateAll(id?: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath("/");
  if (id) revalidatePath(`/properties/${id}`);
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

  return {
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
    images: images.length ? images : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"],
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

  const property = await propertiesRepository.create(input);
  revalidateAll(property.id);
  redirect("/admin/properties");
}

export async function updatePropertyAction(
  id: string,
  _prevState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const input = buildInputFromForm(formData);
  if (!input.title) return { error: "Property title is required." };

  const updated = await propertiesRepository.update(id, input);
  if (!updated) return { error: "Property not found." };

  revalidateAll(id);
  redirect("/admin/properties");
}

export async function deletePropertyAction(id: string) {
  await propertiesRepository.remove(id);
  revalidateAll(id);
}

export async function toggleFeaturedAction(id: string) {
  const property = await propertiesRepository.getById(id);
  if (!property) return;
  await propertiesRepository.update(id, { featured: !property.featured });
  revalidateAll(id);
}

export async function changeStatusAction(id: string, status: Property["status"]) {
  await propertiesRepository.update(id, { status });
  revalidateAll(id);
}
