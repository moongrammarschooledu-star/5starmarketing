"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRateLimited } from "@/lib/rateLimit";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";
import { staffNotificationService } from "@/services/staffNotificationService";
import { automationService } from "@/services/automationService";
import type { LeadStatus } from "@/lib/models/lead";

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

/** Fired from the property WhatsApp-inquiry buttons once the visitor has
 *  given their name and number, so the click shows up as a real lead (with
 *  contact details) in the admin dashboard. WhatsApp's own link never tells
 *  us who is writing, so the details are asked for before it opens. */
export async function trackWhatsAppLeadAction(input: {
  name: string;
  phone: string;
  propertyTitle?: string;
  propertyId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim().slice(0, 120);
  const phone = input.phone.trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!PHONE_PATTERN.test(phone)) return { ok: false, error: "Please enter a valid phone number." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`wa-lead:${ip}`, 60_000, 8)) return { ok: false, error: "Too many requests. Please try again in a minute." };

  const { propertyTitle, propertyId } = input;
  try {
    await leadService.create({
      name,
      phone,
      whatsapp: phone,
      propertyId,
      propertyTitle,
      message: propertyTitle
        ? `Assalam-o-Alaikum, I am interested in ${propertyTitle}. Please share complete details.`
        : "Started a WhatsApp chat from the website.",
      source: "WhatsApp",
      preferredContactMethod: "WhatsApp",
    });
  } catch (e) {
    // The visitor still gets to WhatsApp - a logging failure never blocks them.
    console.error("trackWhatsAppLeadAction failed:", e);
    return { ok: false };
  }
  revalidateAll();
  return { ok: true };
}

/** Fired from brochure download links once the visitor has given their name
 *  and number, so a real download shows up as a lead in the CRM (lead_type:
 *  "Brochure Request") with contact details - never blocks the download. */
export async function trackBrochureDownloadLeadAction(input: {
  name: string;
  phone: string;
  title?: string;
  propertyId?: string;
  projectId?: string;
  projectTitle?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim().slice(0, 120);
  const phone = input.phone.trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!PHONE_PATTERN.test(phone)) return { ok: false, error: "Please enter a valid phone number." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`brochure-lead:${ip}`, 60_000, 8)) return { ok: false, error: "Too many requests. Please try again in a minute." };

  const { title, propertyId, projectId, projectTitle } = input;
  try {
    await leadService.create({
      name,
      phone,
      whatsapp: phone,
      propertyId,
      propertyTitle: propertyId ? title : undefined,
      projectId,
      projectTitle: projectId ? (projectTitle ?? title) : undefined,
      leadType: "Brochure Request",
      message: title ? `Downloaded the brochure for ${title}.` : "Downloaded a brochure.",
      source: "Website",
    });
  } catch (e) {
    console.error("trackBrochureDownloadLeadAction failed:", e);
    return { ok: false };
  }
  revalidateAll();
  return { ok: true };
}

function revalidateAll() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/leads");
  revalidatePath("/admin/crm/pipeline");
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
      // Marketing Automation (STEP 21) — best-effort, never blocks the
      // status update itself. "Qualified" reuses "Interested" (same
      // display-mapping convention as crmStatusLabel).
      try {
        await automationService.executeTrigger("LEAD_STATUS_CHANGED", { leadId: id, newStatus: status });
        if (status === "Interested") {
          await automationService.scheduleFollowUpsFor("LEAD_QUALIFIED", id);
        }
      } catch (e) {
        console.error("updateLeadStatusAction: marketing automation failed:", e);
      }
    }
    revalidateAll();
    revalidatePath(`/admin/leads/${id}`);
    revalidatePath(`/admin/crm/leads/${id}`);
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
    revalidatePath(`/admin/crm/leads/${id}`);
  } catch (e) {
    console.error("updateLeadFollowUpAction failed:", e);
    throw e;
  }
}

export async function assignLeadToMeAction(id: string) {
  try {
    const admin = await profileService.getCurrentAdmin();
    if (!admin) throw new Error("Not signed in.");
    await assignLeadToAgentAction(id, admin.id, admin.name);
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
    await leadService.addNote(leadId, trimmed, admin?.name ?? "Admin", admin?.id);
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath(`/admin/crm/leads/${leadId}`);
    revalidatePath(`/agent/leads/${leadId}`);
  } catch (e) {
    console.error("addLeadNoteAction failed:", e);
    throw e;
  }
}

/** The one path that actually connects a lead to an agent — used by both
 *  the admin "Assign Agent" action and (once wired) automatic assignment.
 *  Logs "Lead Assigned" vs "Lead Reassigned" depending on whether the
 *  lead already had an agent, and notifies the newly-assigned agent. */
export async function assignLeadToAgentAction(
  leadId: string,
  agentId: string | null,
  agentName: string | null,
  reason?: string
) {
  try {
    const existing = await leadService.getById(leadId);
    const wasAssigned = Boolean(existing?.assignedAgentId);
    const changedBy = await profileService.getCurrentAdmin();
    const updated = await leadService.assignAgent(leadId, agentId, agentName, changedBy?.id, reason);
    if (updated) {
      await activityService.log(
        wasAssigned ? "Lead Reassigned" : "Lead Assigned",
        agentName ? `${updated.name} → ${agentName}` : `${updated.name} unassigned`,
        "lead",
        leadId
      );
      if (agentId) {
        await staffNotificationService.notify(
          agentId,
          wasAssigned ? "lead_reassigned" : "lead_assigned",
          wasAssigned ? "Lead reassigned to you" : "New lead assigned to you",
          `${updated.name}${updated.propertyTitle ? ` — ${updated.propertyTitle}` : ""}`,
          "lead",
          leadId
        );
      }
    }
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath(`/admin/crm/leads/${leadId}`);
    revalidateAll();
    revalidatePath("/agent/leads");
    revalidatePath("/agent/dashboard");
  } catch (e) {
    console.error("assignLeadToAgentAction failed:", e);
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
