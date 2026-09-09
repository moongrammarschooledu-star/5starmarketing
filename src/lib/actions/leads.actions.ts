"use server";

import { revalidatePath } from "next/cache";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";
import type { LeadStatus } from "@/lib/models/lead";

/** Fired from the property WhatsApp-inquiry buttons so the click shows up
 *  as a real lead in the admin dashboard, not just an outbound link. */
export async function trackWhatsAppLeadAction(propertyTitle?: string, propertyId?: string) {
  try {
    await leadService.create({
      name: "WhatsApp Visitor",
      phone: "Contacted via WhatsApp",
      propertyId,
      propertyTitle,
      message: propertyTitle
        ? `Assalam-o-Alaikum, I am interested in ${propertyTitle}. Please share complete details.`
        : "Started a WhatsApp chat from the website.",
      source: "WhatsApp",
    });
  } catch (e) {
    // Never block the visitor's WhatsApp click over a logging failure.
    console.error("trackWhatsAppLeadAction failed:", e);
    return;
  }
  revalidateAll();
}

function revalidateAll() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/leads");
}

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
  try {
    const updated = await leadService.updateStatus(id, status);
    if (updated) {
      await activityService.log("Updated Lead", `${updated.name} → ${status}`, "lead", id);
      if (updated.customerId) {
        await notificationService.notify(
          updated.customerId,
          "status_updated",
          "Inquiry status updated",
          `Your inquiry${updated.propertyTitle ? ` about ${updated.propertyTitle}` : ""} is now "${status}".`,
          "lead",
          id
        );
      }
    }
    revalidateAll();
    revalidatePath(`/admin/leads/${id}`);
  } catch (e) {
    console.error("updateLeadStatusAction failed:", e);
    throw e;
  }
}

export async function updateLeadFollowUpAction(id: string, date: string | null, time: string | null) {
  try {
    await leadService.updateFollowUp(id, date, time);
    revalidateAll();
    revalidatePath(`/admin/leads/${id}`);
  } catch (e) {
    console.error("updateLeadFollowUpAction failed:", e);
    throw e;
  }
}

export async function assignLeadAction(id: string, assignedTo: string | null) {
  try {
    await leadService.assign(id, assignedTo);
    revalidatePath(`/admin/leads/${id}`);
    revalidatePath("/admin/leads");
  } catch (e) {
    console.error("assignLeadAction failed:", e);
    throw e;
  }
}

export async function assignLeadToMeAction(id: string) {
  try {
    const admin = await profileService.getCurrentAdmin();
    await leadService.assign(id, admin?.name ?? "Admin");
    revalidatePath(`/admin/leads/${id}`);
    revalidatePath("/admin/leads");
  } catch (e) {
    console.error("assignLeadToMeAction failed:", e);
    throw e;
  }
}

export async function addLeadNoteAction(leadId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return;
  try {
    const admin = await profileService.getCurrentAdmin();
    await leadService.addNote(leadId, trimmed, admin?.name ?? "Admin");
    revalidatePath(`/admin/leads/${leadId}`);
  } catch (e) {
    console.error("addLeadNoteAction failed:", e);
    throw e;
  }
}

export async function deleteLeadAction(id: string) {
  try {
    await leadService.remove(id);
    revalidateAll();
  } catch (e) {
    console.error("deleteLeadAction failed:", e);
  }
}

/** Polled every ~30s by NewLeadNotifier for a reliable "new lead arrived"
 *  signal without needing a realtime subscription. */
export async function getNewLeadsCountAction(): Promise<number> {
  try {
    const stats = await leadService.stats();
    return stats.new;
  } catch (e) {
    console.error("getNewLeadsCountAction failed:", e);
    return 0;
  }
}
