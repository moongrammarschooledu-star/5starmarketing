"use server";

import { revalidatePath } from "next/cache";
import { contactService } from "@/services/contactService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { parsePriceText, parseSizeToMarla } from "@/lib/pkUnits";
import { contactSources, type ContactInput, type ContactSource } from "@/lib/models/contact";
import { propertyTypes, type PropertyType } from "@/lib/models/property";

export interface ContactFormState {
  error?: string;
  ok?: boolean;
}

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

async function requireStaff() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "contacts")) return null;
  return admin;
}

function readInput(formData: FormData): { input?: ContactInput; error?: string } {
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const whatsapp = text(formData, "whatsapp");
  if (!name) return { error: "The customer's name is required." };
  if (!PHONE_PATTERN.test(phone)) return { error: "Please enter a valid contact number." };
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) return { error: "The WhatsApp number does not look right." };

  const source = text(formData, "source");
  const purpose = text(formData, "purpose");
  const type = text(formData, "propertyType");

  const budgetRaw = text(formData, "budgetMax");
  const sizeRaw = text(formData, "sizeMarla");
  const budget = budgetRaw ? parsePriceText(budgetRaw) : null;
  const size = sizeRaw ? parseSizeToMarla(sizeRaw) : null;
  if (budgetRaw && budget === null) return { error: `Could not read the budget "${budgetRaw}". Write it like "1.5 crore" or "75 lac".` };
  if (sizeRaw && size === null) return { error: `Could not read the size "${sizeRaw}". Write it like "8 marla" or "1 kanal".` };

  return {
    input: {
      name,
      phone,
      whatsapp: whatsapp || undefined,
      propertyDetail: text(formData, "propertyDetail") || undefined,
      remarks: text(formData, "remarks") || undefined,
      source: (contactSources as readonly string[]).includes(source) ? (source as ContactSource) : "Walk-in",
      purpose: purpose === "For Sale" || purpose === "For Rent" ? purpose : undefined,
      propertyType: propertyTypes.includes(type as PropertyType) ? (type as PropertyType) : undefined,
      area: text(formData, "area") || undefined,
      budgetMax: budget ?? undefined,
      sizeMarla: size ?? undefined,
    },
  };
}

/** Adds a contact (id = null) or saves changes to one. */
export async function saveContactAction(id: string | null, _prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const admin = await requireStaff();
  if (!admin) return { error: "You do not have access to Customer Contacts." };

  const { input, error } = readInput(formData);
  if (!input) return { error };

  try {
    if (id) {
      const updated = await contactService.update(id, input);
      if (!updated) return { error: "This contact no longer exists." };
      await activityService.log("Updated Contact", updated.name, "contact", id);
    } else {
      const created = await contactService.create(input, admin.id);
      await activityService.log("Added Contact", created.name, "contact", created.id);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this contact." };
  }
  revalidatePath("/admin/contacts");
  return { ok: true };
}

export async function deleteContactAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "You do not have access to Customer Contacts." };
  try {
    const existing = await contactService.getById(id);
    await contactService.remove(id);
    if (existing) await activityService.log("Deleted Contact", existing.name, "contact", id);
    revalidatePath("/admin/contacts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete this contact." };
  }
}

/** Remembers in the activity log that a contact was messaged. Never blocks opening WhatsApp or SMS. */
export async function logContactMessagedAction(id: string, channel: "whatsapp" | "sms", propertyTitle?: string): Promise<void> {
  try {
    const admin = await requireStaff();
    if (!admin) return;
    const contact = await contactService.getById(id);
    if (!contact) return;
    const how = channel === "sms" ? "SMS" : "WhatsApp";
    await activityService.log("Messaged Contact", `${contact.name} by ${how}${propertyTitle ? ` - ${propertyTitle}` : ""}`, "contact", id);
  } catch (e) {
    console.error("logContactMessagedAction failed:", e);
  }
}
