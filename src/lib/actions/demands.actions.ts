"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { demandService } from "@/services/demandService";
import { TICKER_TAG } from "@/services/siteNewsService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { parsePriceText, parseSizeToMarla } from "@/lib/pkUnits";
import {
  demandPriorities,
  demandPurposes,
  demandStatuses,
  type DemandInput,
  type DemandStatus,
} from "@/lib/models/demand";
import { propertyTypes, type PropertyType } from "@/lib/models/property";

export interface DemandFormState {
  error?: string;
}

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** A budget or size typed the way people write it. Empty is fine (no limit),
 *  but text that cannot be read is an error - never silently ignored. */
function readNumber(formData: FormData, name: string, label: string, parse: (s: string) => number | null): { value?: number; error?: string } {
  const raw = text(formData, name);
  if (!raw) return {};
  const value = parse(raw);
  if (value === null) return { error: `Could not read the ${label} "${raw}". Write it like "1.5 crore", "75 lac" or "8 marla", "1 kanal".` };
  return { value };
}

function readInput(formData: FormData): { input?: DemandInput; error?: string } {
  const clientName = text(formData, "clientName");
  const clientPhone = text(formData, "clientPhone");
  const clientWhatsapp = text(formData, "clientWhatsapp");
  if (!clientName) return { error: "The client's name is required." };
  if (!PHONE_PATTERN.test(clientPhone)) return { error: "Please enter a valid phone number for the client." };
  if (clientWhatsapp && !PHONE_PATTERN.test(clientWhatsapp)) return { error: "The WhatsApp number does not look right." };

  const purpose = text(formData, "purpose");
  if (!demandPurposes.includes(purpose as (typeof demandPurposes)[number])) return { error: "Please choose For Sale or For Rent." };

  const types = formData
    .getAll("propertyTypes")
    .map((v) => String(v))
    .filter((v): v is PropertyType => propertyTypes.includes(v as PropertyType));

  const locations = text(formData, "locations")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const budgetMin = readNumber(formData, "budgetMin", "minimum budget", parsePriceText);
  const budgetMax = readNumber(formData, "budgetMax", "maximum budget", parsePriceText);
  const sizeMin = readNumber(formData, "sizeMin", "minimum size", parseSizeToMarla);
  const sizeMax = readNumber(formData, "sizeMax", "maximum size", parseSizeToMarla);
  const firstError = budgetMin.error ?? budgetMax.error ?? sizeMin.error ?? sizeMax.error;
  if (firstError) return { error: firstError };

  if (budgetMin.value != null && budgetMax.value != null && budgetMin.value > budgetMax.value) {
    return { error: "The minimum budget is higher than the maximum budget." };
  }
  if (sizeMin.value != null && sizeMax.value != null && sizeMin.value > sizeMax.value) {
    return { error: "The minimum size is bigger than the maximum size." };
  }

  const bedroomsRaw = text(formData, "minBedrooms");
  const minBedrooms = bedroomsRaw ? Number(bedroomsRaw) : undefined;
  if (minBedrooms !== undefined && (!Number.isInteger(minBedrooms) || minBedrooms < 0 || minBedrooms > 20)) {
    return { error: "Bedrooms must be a whole number." };
  }

  const priority = text(formData, "priority");
  const status = text(formData, "status");

  return {
    input: {
      clientName,
      clientPhone,
      clientWhatsapp: clientWhatsapp || undefined,
      purpose: purpose as DemandInput["purpose"],
      propertyTypes: types,
      locations,
      budgetMin: budgetMin.value,
      budgetMax: budgetMax.value,
      sizeMinMarla: sizeMin.value,
      sizeMaxMarla: sizeMax.value,
      minBedrooms,
      priority: demandPriorities.includes(priority as (typeof demandPriorities)[number]) ? (priority as DemandInput["priority"]) : "Normal",
      status: demandStatuses.includes(status as DemandStatus) ? (status as DemandStatus) : "Open",
      notes: text(formData, "notes") || undefined,
      showOnSite: formData.get("showOnSite") === "on",
      assignedTo: text(formData, "assignedTo") || undefined,
    },
  };
}

function revalidate(id?: string) {
  // The public news bar lists waiting demands, so it must refresh too.
  revalidateTag(TICKER_TAG);
  revalidatePath("/admin/demands");
  if (id) revalidatePath(`/admin/demands/${id}`);
}

export async function createDemandAction(_prev: DemandFormState, formData: FormData): Promise<DemandFormState> {
  const { input, error } = readInput(formData);
  if (!input) return { error };

  let id: string;
  try {
    const admin = await profileService.getCurrentAdmin();
    const demand = await demandService.create(input, admin?.id);
    id = demand.id;
    await activityService.log("Added Demand", `${demand.clientName} - ${demand.purpose}`, "demand", demand.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this demand." };
  }
  revalidate(id);
  redirect(`/admin/demands/${id}`);
}

export async function updateDemandAction(id: string, _prev: DemandFormState, formData: FormData): Promise<DemandFormState> {
  const { input, error } = readInput(formData);
  if (!input) return { error };
  try {
    const demand = await demandService.update(id, input);
    if (!demand) return { error: "This demand no longer exists." };
    await activityService.log("Updated Demand", demand.clientName, "demand", id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update this demand." };
  }
  revalidate(id);
  redirect(`/admin/demands/${id}`);
}

export async function setDemandStatusAction(id: string, status: DemandStatus): Promise<{ ok: boolean; error?: string }> {
  if (!demandStatuses.includes(status)) return { ok: false, error: "Unknown status." };
  try {
    await demandService.setStatus(id, status);
    await activityService.log("Demand Status", `${status}`, "demand", id);
    revalidate(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not change the status." };
  }
}

export async function deleteDemandAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const existing = await demandService.getById(id);
    await demandService.remove(id);
    if (existing) await activityService.log("Deleted Demand", existing.clientName, "demand", id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete this demand." };
  }
}

/** Called when the admin opens WhatsApp with a matching property for the client. */
export async function markDemandSharedAction(demandId: string, propertyId: string): Promise<void> {
  try {
    const admin = await profileService.getCurrentAdmin();
    await demandService.markShared(demandId, propertyId, admin?.id);
    revalidate(demandId);
  } catch (e) {
    // Never blocks opening WhatsApp for the client.
    console.error("markDemandSharedAction failed:", e);
  }
}
