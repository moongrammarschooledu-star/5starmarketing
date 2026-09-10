"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { favoritesService } from "@/services/favoritesService";
import { customerService } from "@/services/customerService";
import { propertyAlertService } from "@/services/propertyAlertService";
import { savedSearchService } from "@/services/savedSearchService";
import { notificationService } from "@/services/notificationService";
import type { CustomerProfileInput, PropertyAlertInput, SavedSearchInput } from "@/lib/models/customer";
import type { PropertySearchFilters } from "@/lib/models/propertySearch";
import { searchAnalyticsService } from "@/services/searchAnalyticsService";

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface ToggleFavoriteResult {
  ok: boolean;
  requiresAuth?: boolean;
  favorited?: boolean;
  error?: string;
}

/** Adds or removes a favorite depending on its current state. Visitors
 *  who aren't logged in get `requiresAuth: true` back — the property card
 *  shows "Please login or create an account to save properties." instead
 *  of silently failing. */
export async function toggleFavoriteAction(propertyId: string): Promise<ToggleFavoriteResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, requiresAuth: true };

  try {
    const existing = await favoritesService.listPropertyIds(userId);
    if (existing.has(propertyId)) {
      await favoritesService.remove(userId, propertyId);
      revalidatePath("/customer/favorites");
      return { ok: true, favorited: false };
    }
    await favoritesService.add(userId, propertyId);
    revalidatePath("/customer/favorites");
    return { ok: true, favorited: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update favorites." };
  }
}

export async function removeFavoriteAction(propertyId: string) {
  const userId = await currentUserId();
  if (!userId) return;
  await favoritesService.remove(userId, propertyId);
  revalidatePath("/customer/favorites");
}

export interface CustomerProfileState {
  error?: string;
  success?: boolean;
}

export async function updateCustomerProfileAction(
  _prevState: CustomerProfileState,
  formData: FormData
): Promise<CustomerProfileState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const profileImage = String(formData.get("profileImage") ?? "").trim();

  if (!fullName) return { error: "Full name is required." };

  const input: CustomerProfileInput = { fullName, phone, whatsapp: whatsapp || undefined, profileImage: profileImage || undefined };
  try {
    await customerService.updateProfile(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update your profile." };
  }
  revalidatePath("/customer/profile");
  revalidatePath("/customer/dashboard");
  return { success: true };
}

export async function updateCustomerEmailAction(
  _prevState: CustomerProfileState,
  formData: FormData
): Promise<CustomerProfileState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };
  try {
    await customerService.updateEmail(email);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update your email." };
  }
  return { success: true };
}

export async function updateCustomerPasswordAction(
  _prevState: CustomerProfileState,
  formData: FormData
): Promise<CustomerProfileState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  try {
    await customerService.updatePassword(password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update your password." };
  }
  return { success: true };
}

// ---- Property alerts ----

export async function createPropertyAlertAction(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;
  const input: PropertyAlertInput = {
    propertyType: String(formData.get("propertyType") ?? "").trim() || undefined,
    location: String(formData.get("location") ?? "").trim() || undefined,
    minPrice: Number(formData.get("minPrice")) || undefined,
    maxPrice: Number(formData.get("maxPrice")) || undefined,
    purpose: String(formData.get("purpose") ?? "").trim() || undefined,
    enabled: true,
  };
  await propertyAlertService.create(userId, input);
  revalidatePath("/customer/property-alerts");
}

export async function togglePropertyAlertAction(id: string, enabled: boolean) {
  await propertyAlertService.toggle(id, enabled);
  revalidatePath("/customer/property-alerts");
}

export async function deletePropertyAlertAction(id: string) {
  await propertyAlertService.remove(id);
  revalidatePath("/customer/property-alerts");
}

// ---- Saved searches ----

export async function createSavedSearchAction(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return;
  const input: SavedSearchInput = {
    name: String(formData.get("name") ?? "").trim() || "My Search",
    propertyType: String(formData.get("propertyType") ?? "").trim() || undefined,
    location: String(formData.get("location") ?? "").trim() || undefined,
    sizeCategory: String(formData.get("sizeCategory") ?? "").trim() || undefined,
    purpose: String(formData.get("purpose") ?? "").trim() || undefined,
    enabled: true,
  };
  await savedSearchService.create(userId, input);
  revalidatePath("/customer/saved-searches");
}

/** STEP 16 — saves the FULL advanced-search filter set (used by the
 *  "Save Search" button on /properties), deriving the legacy loose text
 *  fields best-effort so the existing SavedSearchManager list keeps
 *  displaying something sensible either way. */
export async function createSavedSearchFromFiltersAction(
  name: string,
  filters: PropertySearchFilters,
  notifyMe = false
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Please sign in to save a search." };

  const input: SavedSearchInput = {
    name: name.trim() || "My Search",
    propertyType: filters.type,
    location: filters.area ?? filters.city,
    purpose: filters.purpose,
    filtersJson: filters,
    enabled: true,
  };
  try {
    await savedSearchService.create(userId, input);
    // Architecture only (section 37) — no automated notification is
    // actually sent; this just records that the customer opted in, for
    // a future scheduled job to read.
    if (notifyMe) {
      await propertyAlertService.create(userId, {
        propertyType: filters.type,
        location: filters.area ?? filters.city,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        purpose: filters.purpose,
        filtersJson: filters,
        enabled: true,
      });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save this search." };
  }
  await searchAnalyticsService.record("saved_search_created", { customerId: userId, filters });
  revalidatePath("/customer/saved-searches");
  revalidatePath("/customer/property-alerts");
  return { ok: true };
}

export async function toggleSavedSearchAction(id: string, enabled: boolean) {
  await savedSearchService.toggle(id, enabled);
  revalidatePath("/customer/saved-searches");
}

export async function deleteSavedSearchAction(id: string) {
  await savedSearchService.remove(id);
  revalidatePath("/customer/saved-searches");
}

// ---- Notifications ----

export async function markNotificationReadAction(id: string) {
  await notificationService.markRead(id);
  revalidatePath("/customer/dashboard");
}
