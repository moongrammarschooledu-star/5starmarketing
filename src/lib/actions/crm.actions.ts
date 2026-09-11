"use server";

import { revalidatePath } from "next/cache";
import { leadService } from "@/services/leadService";
import { communicationLogService } from "@/services/communicationLogService";
import { profileService } from "@/services/profileService";
import { activityService } from "@/services/activityService";
import { notificationService } from "@/services/notificationService";
import { automationService } from "@/services/automationService";
import { canAccess } from "@/lib/permissions";
import type { LeadPriority, LeadType, LeadPurpose, LostReason } from "@/lib/models/lead";
import type { CommunicationType, CommunicationDirection } from "@/lib/models/crm";

function revalidateLead(id: string) {
  revalidatePath(`/admin/crm/leads/${id}`);
  revalidatePath("/admin/crm/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/pipeline");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath(`/agent/leads/${id}`);
}

async function requireCrmAdmin() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "leads")) throw new Error("Not authorized.");
  return admin;
}

/** Mark Converted (section 35) — requires confirmation client-side; this
 *  action only ever stores conversion metadata on the lead itself, never
 *  an invented transaction/deal record (no such module exists here). */
export async function markLeadConvertedAction(id: string) {
  const admin = await requireCrmAdmin();
  const updated = await leadService.markConverted(id, admin.id);
  if (updated) {
    await activityService.log("Lead Converted", `${updated.name} marked as converted by ${admin.name}`, "lead", id);
    if (updated.customerId) {
      await notificationService.notify(
        updated.customerId,
        "status_updated",
        "Great news!",
        `Your inquiry${updated.propertyTitle ? ` about ${updated.propertyTitle}` : ""} has been marked as converted.`,
        "lead",
        id
      );
    }
    // Marketing Automation (STEP 21, section 68) — preserves attribution
    // (already immutable at the DB level), fires a conversion event, and
    // is the one trigger allowed to run even on a Closed lead.
    try {
      await automationService.executeTrigger("LEAD_CONVERTED", { leadId: id });
    } catch (e) {
      console.error("markLeadConvertedAction: marketing automation failed:", e);
    }
  }
  revalidateLead(id);
}

/** Mark Lost (section 36) — always requires a reason from the fixed list. */
export async function markLeadLostAction(id: string, reason: LostReason) {
  const admin = await requireCrmAdmin();
  const updated = await leadService.markLost(id, reason);
  if (updated) {
    await activityService.log("Lead Lost", `${updated.name} marked as lost by ${admin.name} — ${reason}`, "lead", id);
  }
  revalidateLead(id);
}

export async function archiveLeadAction(id: string) {
  const admin = await requireCrmAdmin();
  const lead = await leadService.getById(id);
  await leadService.archive(id);
  await activityService.log("Lead Archived", `${lead?.name ?? "Lead"} archived by ${admin.name}`, "lead", id);
  revalidateLead(id);
}

export async function unarchiveLeadAction(id: string) {
  const admin = await requireCrmAdmin();
  const lead = await leadService.getById(id);
  await leadService.unarchive(id);
  await activityService.log("Lead Restored", `${lead?.name ?? "Lead"} restored from archive by ${admin.name}`, "lead", id);
  revalidateLead(id);
}

export async function setLeadPriorityAction(id: string, priority: LeadPriority) {
  await requireCrmAdmin();
  await leadService.setPriority(id, priority);
  await activityService.log("Priority Changed", `Priority set to ${priority}`, "lead", id);
  revalidateLead(id);
}

export async function setLeadTypeAction(id: string, leadType: LeadType) {
  await requireCrmAdmin();
  await leadService.setLeadType(id, leadType);
  await activityService.log("Lead Type Changed", `Lead type set to ${leadType}`, "lead", id);
  revalidateLead(id);
}

export async function updateLeadRequirementsAction(
  id: string,
  input: {
    purpose?: LeadPurpose;
    budgetMin?: number;
    budgetMax?: number;
    preferredLocation?: string;
    preferredPropertyType?: string;
    preferredBedrooms?: number;
  }
) {
  await requireCrmAdmin();
  if (input.budgetMin != null && input.budgetMax != null && input.budgetMin > input.budgetMax) {
    throw new Error("Minimum budget cannot be greater than maximum budget.");
  }
  await leadService.updateRequirements(id, input);
  await activityService.log("Lead Updated", "Customer requirements updated", "lead", id);
  revalidateLead(id);
}

/** Merge Lead A into Lead B (section 34) — admin-authorized, relinks every
 *  related record onto the target and archives the source. Never deletes. */
export async function mergeLeadsAction(sourceId: string, targetId: string) {
  const admin = await requireCrmAdmin();
  await leadService.mergeInto(sourceId, targetId, admin.name);
  await activityService.log("Leads Merged", `Lead ${sourceId} merged into ${targetId} by ${admin.name}`, "lead", targetId);
  revalidateLead(sourceId);
  revalidateLead(targetId);
}

/** Communication Log (section 24) — a manual record that a real
 *  phone/WhatsApp/email/SMS/meeting contact happened. Never call this
 *  automatically; it must only ever reflect something a person actually
 *  did and is now recording. */
export async function logCommunicationAction(
  leadId: string,
  communicationType: CommunicationType,
  direction: CommunicationDirection,
  summary: string
) {
  const trimmed = summary.trim();
  if (!trimmed) throw new Error("Please describe what was discussed.");
  const admin = await requireCrmAdmin();
  await communicationLogService.log({ leadId, communicationType, direction, summary: trimmed }, admin.id);
  await activityService.log("Communication Logged", `${communicationType} (${direction}) logged by ${admin.name}`, "lead", leadId);
  revalidateLead(leadId);
}
