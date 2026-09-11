"use server";

import { revalidatePath } from "next/cache";
import { communicationService } from "@/services/communicationService";
import { communicationCallLogService } from "@/services/communicationCallLogService";
import { communicationAttachmentService } from "@/services/communicationAttachmentService";
import { customerService } from "@/services/customerService";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { canAccess, canManageCommunicationSettings } from "@/lib/permissions";
import type { CommChannel, CallLogInput, CommunicationSettingsInput, ConsentField } from "@/lib/models/communication";
import type { LeadSource } from "@/lib/models/lead";

async function requireCommAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "communications")) throw new Error("Not authorized.");
  return admin;
}

async function requireCommManageAccess() {
  const admin = await requireCommAccess();
  if (!canManageCommunicationSettings(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateAll(conversationId?: string) {
  revalidatePath("/admin/communications");
  revalidatePath("/admin/communications/inbox");
  revalidatePath("/admin/communications/conversations");
  revalidatePath("/admin/communications/scheduled");
  revalidatePath("/admin/communications/failed");
  revalidatePath("/agent/communications");
  revalidatePath("/agent/communications/inbox");
  if (conversationId) {
    revalidatePath(`/admin/communications/conversations/${conversationId}`);
    revalidatePath(`/agent/communications/conversations/${conversationId}`);
  }
}

export async function composeMessageAction(input: {
  conversationId: string;
  channel: CommChannel;
  direction: "OUTBOUND" | "INTERNAL";
  subject?: string;
  body: string;
  templateId?: string;
  isPrivateNote?: boolean;
  isMarketing?: boolean;
  scheduledFor?: string;
  saveDraft?: boolean;
  recipientPhone?: string;
  recipientEmail?: string;
}) {
  const admin = await requireCommAccess();
  const message = await communicationService.composeAndSend(input, { adminId: admin.id, name: admin.name });
  revalidateAll(input.conversationId);
  return message;
}

export async function sendDraftAction(messageId: string, conversationId: string) {
  await requireCommAccess();
  const message = await communicationService.sendDraft(messageId);
  revalidateAll(conversationId);
  return message;
}

export async function cancelScheduledMessageAction(messageId: string, conversationId: string) {
  await requireCommAccess();
  await communicationService.cancelScheduled(messageId);
  revalidateAll(conversationId);
}

export async function retryFailedMessageAction(messageId: string, conversationId: string) {
  await requireCommAccess();
  const message = await communicationService.retryFailed(messageId);
  revalidateAll(conversationId);
  return message;
}

export async function assignConversationAction(conversationId: string, agentId: string | null, reason?: string) {
  const admin = await requireCommAccess();
  await communicationService.assignAgent(conversationId, agentId, admin.id, reason);
  revalidateAll(conversationId);
}

export async function transferConversationAction(conversationId: string, agentId: string, reason?: string) {
  const admin = await requireCommManageAccess();
  await communicationService.assignAgent(conversationId, agentId, admin.id, reason || "Transferred");
  revalidateAll(conversationId);
}

export async function setConversationPriorityAction(conversationId: string, priority: "LOW" | "NORMAL" | "HIGH" | "URGENT") {
  await requireCommAccess();
  await communicationService.setPriority(conversationId, priority);
  revalidateAll(conversationId);
}

export async function setConversationStatusAction(conversationId: string, status: "OPEN" | "CLOSED" | "ARCHIVED") {
  await requireCommAccess();
  await communicationService.setStatus(conversationId, status);
  revalidateAll(conversationId);
}

export async function markConversationReadAction(conversationId: string) {
  const admin = await requireCommAccess();
  await communicationService.markRead(conversationId, admin.id);
  revalidateAll(conversationId);
}

export async function markConversationUnreadAction(conversationId: string) {
  const admin = await requireCommAccess();
  await communicationService.markUnread(conversationId, admin.id);
  revalidateAll(conversationId);
}

export async function addConversationTagAction(conversationId: string, tagId: string) {
  await requireCommAccess();
  await communicationService.addTag(conversationId, tagId);
  revalidateAll(conversationId);
}

export async function removeConversationTagAction(conversationId: string, tagId: string) {
  await requireCommAccess();
  await communicationService.removeTag(conversationId, tagId);
  revalidateAll(conversationId);
}

// ---- Unmatched conversations (section 46) ----

export async function linkConversationToLeadAction(conversationId: string, leadId: string) {
  await requireCommAccess();
  await communicationService.linkToLead(conversationId, leadId);
  revalidateAll(conversationId);
}

export async function createLeadFromUnmatchedAction(conversationId: string) {
  await requireCommAccess();
  const conversation = await communicationService.getById(conversationId);
  if (!conversation) throw new Error("Conversation not found.");
  if (!conversation.counterpartPhone && !conversation.counterpartEmail) throw new Error("This conversation has no contact details to create a lead from.");

  const source: LeadSource = conversation.channel === "WHATSAPP" ? "WhatsApp" : conversation.channel === "EMAIL" ? "Other" : "Other";
  await leadService.create({
    name: conversation.counterpartName || "Unknown Contact",
    phone: conversation.counterpartPhone || "",
    email: conversation.counterpartEmail,
    message: conversation.lastMessagePreview || "Started a conversation.",
    source,
  });
  const lead = await leadService.findExistingForContact(undefined, conversation.counterpartPhone);
  if (lead) await communicationService.linkToLead(conversationId, lead.id);
  revalidateAll(conversationId);
  return lead;
}

export async function ignoreUnmatchedConversationAction(conversationId: string) {
  await requireCommAccess();
  await communicationService.setStatus(conversationId, "ARCHIVED");
  revalidateAll(conversationId);
}

// ---- Attachments (sections 54-56) ----

export async function uploadMessageAttachmentAction(messageId: string, conversationId: string, fileName: string, dataUri: string) {
  await requireCommAccess();
  const attachment = await communicationAttachmentService.uploadForMessage(messageId, conversationId, fileName, dataUri);
  revalidateAll(conversationId);
  return attachment;
}

export async function getAttachmentSignedUrlAction(attachmentId: string) {
  await profileService.getCurrentAdmin().then((a) => {
    if (!a) throw new Error("Not authorized.");
  });
  return communicationAttachmentService.getSignedUrl(attachmentId);
}

export async function getPortalAttachmentSignedUrlAction(attachmentId: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not authorized.");
  return communicationAttachmentService.getSignedUrl(attachmentId);
}

// ---- Manual call log (sections 37-38) ----

export async function logCallAction(input: CallLogInput) {
  const admin = await requireCommAccess();
  const entry = await communicationCallLogService.log(input, admin.id, admin.name);
  if (input.conversationId) revalidateAll(input.conversationId);
  revalidatePath(`/admin/crm/leads/${input.leadId}`);
  return entry;
}

// ---- Consent / Do-Not-Contact ----

export async function updateCustomerConsentFieldAction(customerId: string, field: ConsentField, value: boolean) {
  await requireCommAccess();
  await communicationService.updateConsent(customerId, field, value, "admin");
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function setCustomerDoNotContactAction(customerId: string, doNotContact: boolean) {
  await requireCommAccess();
  await customerService.setDoNotContact(customerId, doNotContact);
  await communicationService.updateConsent(customerId, "do_not_contact", doNotContact, "admin");
  revalidatePath(`/admin/customers/${customerId}`);
}

// ---- Settings ----

export async function updateCommunicationSettingsAction(input: CommunicationSettingsInput) {
  await requireCommManageAccess();
  await communicationService.updateSettings(input);
  revalidatePath("/admin/communications/settings");
}

// ---- Customer portal reply (section 70) ----

export async function sendPortalReplyAction(conversationId: string, body: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not signed in.");
  const conversation = await communicationService.getById(conversationId);
  if (!conversation || conversation.customerId !== customer.id) throw new Error("Not authorized.");

  const message = await communicationService.customerReply(conversationId, customer.id, customer.fullName, body);
  revalidatePath(`/customer/messages/${conversationId}`);
  revalidatePath("/customer/messages");
  return message;
}
