"use server";

import { revalidatePath } from "next/cache";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";
import { staffNotificationService } from "@/services/staffNotificationService";
import { automationService } from "@/services/automationService";
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

/** Fired from brochure download links so a real download shows up as a
 *  lead in the CRM (lead_type: "Brochure Request"), mirroring how
 *  trackWhatsAppLeadAction turns a WhatsApp click into a lead — never
 *  blocks the actual download. */
export async function trackBrochureDownloadLeadAction(title?: string, propertyId?: string, projectId?: string, projectTitle?: string) {
  try {
    await leadService.create({
      name: "Brochure Visitor",
      phone: "Downloaded Brochure",
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
    return;
  }
  revalidateAll();
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
