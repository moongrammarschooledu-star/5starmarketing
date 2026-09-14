import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import { communicationService } from "./communicationService";
import { LEGAL_NOTICE_ALLOWED_TRANSITIONS } from "@/lib/models/legal";
import type { LegalNotice, LegalNoticeInput, LegalNoticeStatus } from "@/lib/models/legal";

const SELECT = "*, properties(title), legal_cases(case_number), communication_messages(status, sent_at, delivered_at, read_at)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalNotice {
  return {
    id: row.id,
    noticeNumber: row.notice_number,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    caseId: row.case_id ?? undefined,
    caseNumber: row.legal_cases?.case_number ?? undefined,
    recipientType: row.recipient_type,
    recipientCustomerId: row.recipient_customer_id ?? undefined,
    recipientName: row.recipient_name,
    noticeType: row.notice_type,
    subject: row.subject,
    body: row.body,
    documentId: row.document_id ?? undefined,
    communicationMessageId: row.communication_message_id ?? undefined,
    communicationMessageStatus: row.communication_messages?.status ?? undefined,
    sentVia: row.sent_via ?? undefined,
    sentAt: row.sent_at ?? undefined,
    manualDeliveryConfirmed: !!row.manual_delivery_confirmed,
    manualDeliveryConfirmedAt: row.manual_delivery_confirmed_at ?? undefined,
    manualDeliveryConfirmedBy: row.manual_delivery_confirmed_by ?? undefined,
    responseDueDate: row.response_due_date ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalNoticeService = {
  async list(filters?: { propertyId?: string; caseId?: string; status?: LegalNoticeStatus; recipientCustomerId?: string }): Promise<LegalNotice[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_notices").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.caseId) query = query.eq("case_id", filters.caseId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.recipientCustomerId) query = query.eq("recipient_customer_id", filters.recipientCustomerId);
    const { data, error } = await query;
    if (error) {
      console.error("legalNoticeService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<LegalNotice | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_notices").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async createDraft(input: LegalNoticeInput, actorId: string): Promise<LegalNotice> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_notices")
      .insert({
        property_id: input.propertyId || null,
        case_id: input.caseId || null,
        recipient_type: input.recipientType ?? "CUSTOMER",
        recipient_customer_id: input.recipientCustomerId || null,
        recipient_name: input.recipientName,
        notice_type: input.noticeType ?? "OTHER",
        subject: input.subject,
        body: input.body,
        response_due_date: input.responseDueDate || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("legalNoticeService.createDraft failed:", error);
      throw new Error("Could not create this legal notice.");
    }
    return mapRow(data);
  },

  /** Sends via the EXISTING Communication Center when the recipient is
   *  a registered customer — delivery status is read LIVE from that
   *  message afterward, never duplicated into a second stored boolean. */
  async sendViaCommunicationCenter(id: string, actor: { adminId?: string; name: string }): Promise<LegalNotice> {
    const notice = await this.getById(id);
    if (!notice) throw new Error("Legal notice not found.");
    if (!LEGAL_NOTICE_ALLOWED_TRANSITIONS[notice.status]?.includes("SENT")) {
      throw new Error(`Cannot send a notice that is already "${notice.status}".`);
    }
    if (!notice.recipientCustomerId) {
      throw new Error("This recipient has no linked customer account — record it as manually sent instead.");
    }
    const conversation = await communicationService.findOrCreateForCustomer(notice.recipientCustomerId, "PORTAL");
    const message = await communicationService.composeAndSend(
      { conversationId: conversation.id, channel: "PORTAL", direction: "OUTBOUND", subject: notice.subject, body: notice.body },
      { adminId: actor.adminId, name: actor.name }
    );
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_notices")
      .update({ status: "SENT", sent_via: "COMMUNICATION_CENTER", sent_at: new Date().toISOString(), communication_message_id: message.id })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error("Could not mark this notice as sent.");
    await legalAuditService.log({ entityType: "legal_notice", entityId: id, action: "Sent via Communication Center", actorId: actor.adminId, actorName: actor.name });
    return mapRow(data);
  },

  /** For a notice sent OUTSIDE the Communication Center (post, hand
   *  delivery, a third party with no account) — delivery confirmation
   *  is a distinct, explicit manual action, never inferred. */
  async recordManualSend(id: string, sentVia: "EMAIL" | "SMS" | "POST" | "HAND_DELIVERY" | "OTHER", actor: { adminId?: string; name: string }): Promise<LegalNotice> {
    const notice = await this.getById(id);
    if (!notice) throw new Error("Legal notice not found.");
    if (!LEGAL_NOTICE_ALLOWED_TRANSITIONS[notice.status]?.includes("SENT")) {
      throw new Error(`Cannot send a notice that is already "${notice.status}".`);
    }
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_notices").update({ status: "SENT", sent_via: sentVia, sent_at: new Date().toISOString() }).eq("id", id).select(SELECT).single();
    if (error) throw new Error("Could not mark this notice as sent.");
    await legalAuditService.log({ entityType: "legal_notice", entityId: id, action: `Sent manually via ${sentVia}`, actorId: actor.adminId, actorName: actor.name });
    return mapRow(data);
  },

  async confirmManualDelivery(id: string, actor: { adminId?: string; name: string }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("legal_notices")
      .update({ manual_delivery_confirmed: true, manual_delivery_confirmed_at: new Date().toISOString(), manual_delivery_confirmed_by: actor.adminId || null, status: "DELIVERED" })
      .eq("id", id);
    if (error) throw new Error("Could not confirm delivery for this notice.");
    await legalAuditService.log({ entityType: "legal_notice", entityId: id, action: "Manual delivery confirmed", actorId: actor.adminId, actorName: actor.name });
  },

  async markResponded(id: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("legal_notices").update({ status: "RESPONDED" }).eq("id", id);
    if (error) throw new Error("Could not update this notice.");
    await legalAuditService.log({ entityType: "legal_notice", entityId: id, action: "Marked responded", actorId, actorName });
  },

  async cancel(id: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("legal_notices").update({ status: "CANCELLED" }).eq("id", id);
    if (error) throw new Error("Could not cancel this notice.");
    await legalAuditService.log({ entityType: "legal_notice", entityId: id, action: "Cancelled", actorId, actorName });
  },
};
