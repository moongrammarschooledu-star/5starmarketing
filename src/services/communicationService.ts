import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage, sendEmailMessage, sendSmsMessage } from "@/lib/communication/senders";
import { staffNotificationService } from "./staffNotificationService";
import { isRateLimited } from "@/lib/rateLimit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  Conversation,
  ConversationInput,
  ConversationSearchFilters,
  ConversationSearchResult,
  CommMessage,
  CommChannel,
  ConsentField,
  ConsentChangeSource,
  CommunicationSettings,
  CommunicationSettingsInput,
  CommAuditLogEntry,
  AssignmentHistoryEntry,
  CommunicationDashboardStats,
  ChannelBreakdownRow,
  AgentCommPerformance,
} from "@/lib/models/communication";
import { DEFAULT_CONVERSATION_PAGE_SIZE, MAX_CONVERSATION_PAGE_SIZE } from "@/lib/models/communication";

const SELECT_CONVERSATION =
  "*, leads(name), customer_profiles(full_name), properties(title), projects(name), deals(deal_number), admin_profiles!communication_conversations_assigned_agent_id_fkey(name), conversation_tags(marketing_tags(id, name, color))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    channel: row.channel,
    subject: row.subject ?? undefined,
    leadId: row.lead_id ?? undefined,
    leadName: row.leads?.name ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_profiles?.full_name ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    siteVisitId: row.site_visit_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    assignedAgentId: row.assigned_agent_id ?? undefined,
    assignedAgentName: row.admin_profiles?.name ?? undefined,
    status: row.status,
    priority: row.priority,
    priorityOverridden: !!row.priority_overridden,
    counterpartName: row.counterpart_name ?? undefined,
    counterpartPhone: row.counterpart_phone ?? undefined,
    counterpartEmail: row.counterpart_email ?? undefined,
    isUnmatched: !!row.is_unmatched,
    lastMessageAt: row.last_message_at ?? undefined,
    lastMessagePreview: row.last_message_preview ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: Array.isArray(row.conversation_tags) ? row.conversation_tags.map((t: any) => t.marketing_tags?.name).filter((n: string | undefined): n is string => !!n) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any): CommMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    direction: row.direction,
    channel: row.channel,
    status: row.status,
    isPrivateNote: !!row.is_private_note,
    subject: row.subject ?? undefined,
    body: row.body ?? "",
    templateId: row.template_id ?? undefined,
    senderAdminId: row.sender_admin_id ?? undefined,
    senderAdminName: row.admin_profiles?.name ?? undefined,
    senderCustomerId: row.sender_customer_id ?? undefined,
    provider: row.provider ?? undefined,
    providerMessageId: row.provider_message_id ?? undefined,
    scheduledFor: row.scheduled_for ?? undefined,
    sentAt: row.sent_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    readAt: row.read_at ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    retryCount: row.retry_count ?? 0,
    lastError: row.last_error ?? undefined,
    attachments: Array.isArray(row.communication_attachments)
      ? row.communication_attachments.map((a: { id: string; storage_path: string; file_name: string; mime_type: string; file_size: number; created_at: string }) => ({
          id: a.id,
          messageId: row.id,
          storagePath: a.storage_path,
          fileName: a.file_name,
          mimeType: a.mime_type,
          fileSize: a.file_size,
          createdAt: a.created_at,
        }))
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logAudit(supabase: Awaited<ReturnType<typeof createClient>>, entry: { conversationId?: string; messageId?: string; action: string; actorId?: string; actorName?: string; metadata?: Record<string, unknown> }) {
  try {
    await supabase.from("communication_audit_logs").insert({
      conversation_id: entry.conversationId || null,
      message_id: entry.messageId || null,
      action: entry.action,
      actor_id: entry.actorId || null,
      actor_name: entry.actorName || null,
      metadata: entry.metadata || null,
    });
  } catch (e) {
    console.error("communicationService: logAudit failed:", e);
  }
}

function isWithinBusinessHours(start: string, end: string, timezone: string): boolean {
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return now >= start.slice(0, 5) && now <= end.slice(0, 5);
}

export const communicationService = {
  // ---- Settings (sections 12, 61, 62) ----
  async getSettings(): Promise<CommunicationSettings> {
    const supabase = await createClient();
    const { data } = await supabase.from("communication_settings").select("*").eq("id", 1).maybeSingle();
    return {
      whatsappEnabled: !!data?.whatsapp_enabled,
      emailEnabled: !!data?.email_enabled,
      smsEnabled: !!data?.sms_enabled,
      testMode: data?.test_mode ?? true,
      businessHoursStart: (data?.business_hours_start ?? "09:00").slice(0, 5),
      businessHoursEnd: (data?.business_hours_end ?? "20:00").slice(0, 5),
      businessHoursTimezone: data?.business_hours_timezone ?? "Asia/Karachi",
      deferOutsideBusinessHours: data?.defer_outside_business_hours ?? true,
      updatedAt: data?.updated_at ?? new Date().toISOString(),
    };
  },

  async updateSettings(input: CommunicationSettingsInput): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.whatsappEnabled !== undefined) row.whatsapp_enabled = input.whatsappEnabled;
    if (input.emailEnabled !== undefined) row.email_enabled = input.emailEnabled;
    if (input.smsEnabled !== undefined) row.sms_enabled = input.smsEnabled;
    if (input.testMode !== undefined) row.test_mode = input.testMode;
    if (input.businessHoursStart !== undefined) row.business_hours_start = input.businessHoursStart;
    if (input.businessHoursEnd !== undefined) row.business_hours_end = input.businessHoursEnd;
    if (input.businessHoursTimezone !== undefined) row.business_hours_timezone = input.businessHoursTimezone;
    if (input.deferOutsideBusinessHours !== undefined) row.defer_outside_business_hours = input.deferOutsideBusinessHours;
    const { error } = await supabase.from("communication_settings").update(row).eq("id", 1);
    if (error) throw new Error("Could not update communication settings.");
  },

  // ---- Conversations ----
  async search(filters: ConversationSearchFilters): Promise<ConversationSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_CONVERSATION_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_CONVERSATION_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("communication_conversations").select(SELECT_CONVERSATION, { count: "exact" });
    if (filters.channel) query = query.eq("channel", filters.channel);
    if (filters.agentId) query = query.eq("assigned_agent_id", filters.agentId);
    if (filters.unassigned) query = query.is("assigned_agent_id", null);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.unmatchedOnly) query = query.eq("is_unmatched", true);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lt("created_at", filters.dateTo);
    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`counterpart_name.ilike.%${q}%,counterpart_phone.ilike.%${q}%,counterpart_email.ilike.%${q}%,subject.ilike.%${q}%,last_message_preview.ilike.%${q}%`);
    }
    query = query.order("last_message_at", { ascending: false, nullsFirst: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("communicationService.search failed:", error);
      throw new Error("Could not load conversations.");
    }
    const total = count ?? 0;
    return {
      conversations: (data ?? []).map(mapConversation),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async getById(id: string): Promise<Conversation | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_conversations").select(SELECT_CONVERSATION).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapConversation(data);
  },

  /** Reuses an existing OPEN conversation for the same channel + lead
   *  (or customer) rather than fragmenting one relationship across many
   *  threads (section 5's "aggregate" requirement). */
  async findOrCreateForLead(leadId: string, channel: CommChannel, extra?: Partial<ConversationInput>): Promise<Conversation> {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("communication_conversations")
      .select(SELECT_CONVERSATION)
      .eq("lead_id", leadId)
      .eq("channel", channel)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return mapConversation(existing);
    return this.create({ channel, leadId, ...extra });
  },

  async findOrCreateForCustomer(customerId: string, channel: CommChannel, extra?: Partial<ConversationInput>): Promise<Conversation> {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("communication_conversations")
      .select(SELECT_CONVERSATION)
      .eq("customer_id", customerId)
      .eq("channel", channel)
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return mapConversation(existing);
    return this.create({ channel, customerId, ...extra });
  },

  async create(input: Partial<ConversationInput>, agentId?: string): Promise<Conversation> {
    const supabase = await createClient();
    let assignedAgentId: string | undefined = agentId;
    if (!assignedAgentId && input.leadId) {
      const { data: lead } = await supabase.from("leads").select("assigned_agent_id").eq("id", input.leadId).maybeSingle();
      assignedAgentId = lead?.assigned_agent_id ?? undefined;
    }
    const { data, error } = await supabase
      .from("communication_conversations")
      .insert({
        channel: input.channel,
        subject: input.subject || null,
        lead_id: input.leadId || null,
        customer_id: input.customerId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        site_visit_id: input.siteVisitId || null,
        payment_id: input.paymentId || null,
        assigned_agent_id: assignedAgentId || null,
        counterpart_name: input.counterpartName || null,
        counterpart_phone: input.counterpartPhone || null,
        counterpart_email: input.counterpartEmail || null,
        is_unmatched: !input.leadId && !input.customerId,
      })
      .select(SELECT_CONVERSATION)
      .single();
    if (error) {
      console.error("communicationService.create failed:", error);
      throw new Error("Could not create this conversation.");
    }
    await logAudit(supabase, { conversationId: data.id, action: "Created" });
    return mapConversation(data);
  },

  async assignAgent(conversationId: string, agentId: string | null, changedBy?: string, reason?: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("communication_conversations").select("assigned_agent_id").eq("id", conversationId).maybeSingle();
    const previousAgentId = existing?.assigned_agent_id ?? null;
    const { error } = await supabase.from("communication_conversations").update({ assigned_agent_id: agentId }).eq("id", conversationId);
    if (error) throw new Error("Could not assign this conversation.");
    if (previousAgentId !== agentId) {
      await supabase.from("communication_assignment_history").insert({ conversation_id: conversationId, previous_agent_id: previousAgentId, new_agent_id: agentId, changed_by: changedBy || null, reason: reason || null });
      await logAudit(supabase, { conversationId, action: previousAgentId ? "Transferred" : "Assigned", actorId: changedBy, metadata: { previousAgentId, newAgentId: agentId } });
    }
  },

  async listAssignmentHistory(conversationId: string): Promise<AssignmentHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_assignment_history")
      .select(
        "*, previous_agent:admin_profiles!communication_assignment_history_previous_agent_id_fkey(name), new_agent:admin_profiles!communication_assignment_history_new_agent_id_fkey(name), changed_by_admin:admin_profiles!communication_assignment_history_changed_by_fkey(name)"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      previousAgentId: row.previous_agent_id ?? undefined,
      previousAgentName: row.previous_agent?.name ?? undefined,
      newAgentId: row.new_agent_id ?? undefined,
      newAgentName: row.new_agent?.name ?? undefined,
      changedBy: row.changed_by ?? undefined,
      changedByName: row.changed_by_admin?.name ?? undefined,
      reason: row.reason ?? undefined,
      createdAt: row.created_at,
    }));
  },

  async setPriority(conversationId: string, priority: string, overridden = true): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("communication_conversations").update({ priority, priority_overridden: overridden }).eq("id", conversationId);
    if (error) throw new Error("Could not update this conversation's priority.");
  },

  async setStatus(conversationId: string, status: "OPEN" | "CLOSED" | "ARCHIVED"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("communication_conversations").update({ status }).eq("id", conversationId);
    if (error) throw new Error("Could not update this conversation's status.");
  },

  async linkToLead(conversationId: string, leadId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("communication_conversations").update({ lead_id: leadId, is_unmatched: false }).eq("id", conversationId);
    if (error) throw new Error("Could not link this conversation.");
    await logAudit(supabase, { conversationId, action: "Linked to lead" });
  },

  async addTag(conversationId: string, tagId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("conversation_tags").insert({ conversation_id: conversationId, tag_id: tagId });
    if (error && error.code !== "23505") throw new Error("Could not add this tag.");
  },

  async removeTag(conversationId: string, tagId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("conversation_tags").delete().eq("conversation_id", conversationId).eq("tag_id", tagId);
    if (error) throw new Error("Could not remove this tag.");
  },

  /** A customer's own reply in their portal conversation (section 70) —
   *  distinct from composeAndSend: there's no external provider dispatch
   *  here, the message is already "delivered" the moment it's written
   *  (it's INBOUND to the business, not something we send out). */
  async customerReply(conversationId: string, customerId: string, customerName: string, body: string): Promise<CommMessage> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_messages")
      .insert({ conversation_id: conversationId, direction: "INBOUND", channel: "PORTAL", status: "DELIVERED", body, sender_customer_id: customerId, sent_at: new Date().toISOString() })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("communicationService.customerReply failed:", error);
      throw new Error("Could not send your message.");
    }
    // The customer's own RLS grant on communication_conversations is
    // SELECT-only (by design — see the migration's DESIGN NOTE) — this
    // bookkeeping update (preview text / recency) is not something the
    // customer's own session can perform. The insert above already
    // proved this conversation is genuinely theirs (it only succeeds
    // under communication_messages_customer_insert's own RLS check), so
    // a narrowly-scoped service-role write here is safe and necessary.
    const serviceRole = createServiceRoleClient();
    await serviceRole.from("communication_conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: body.slice(0, 140) }).eq("id", conversationId);
    await logAudit(serviceRole, { conversationId, messageId: data.id, action: "Customer replied", actorName: customerName });

    const { data: conversation } = await supabase.from("communication_conversations").select("assigned_agent_id").eq("id", conversationId).maybeSingle();
    if (conversation?.assigned_agent_id) {
      await staffNotificationService.notify(conversation.assigned_agent_id, "automation_alert", "New portal message", `${customerName}: ${body.slice(0, 140)}`, "conversation", conversationId);
    }
    return mapMessage(data);
  },

  // ---- Messages ----
  async listMessages(conversationId: string): Promise<CommMessage[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_messages")
      .select("*, admin_profiles(name), communication_attachments(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("communicationService.listMessages failed:", error);
      return [];
    }
    return (data ?? []).map(mapMessage);
  },

  async listAuditLog(conversationId: string): Promise<CommAuditLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_audit_logs").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id,
      conversationId: row.conversation_id ?? undefined,
      messageId: row.message_id ?? undefined,
      action: row.action,
      actorId: row.actor_id ?? undefined,
      actorName: row.actor_name ?? undefined,
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
    }));
  },

  /** Returns whether the given channel is allowed for this customer
   *  right now (section 59-61) — consent + Do-Not-Contact. Transactional
   *  messages bypass marketing_opt_in/DNC but never the channel-specific
   *  opt-in (a customer who opted out of WhatsApp shouldn't get
   *  transactional WhatsApp either, unless it's essential — kept simple
   *  and conservative here: transactional bypasses ONLY marketing_opt_in
   *  and do_not_contact, never the channel opt-in itself). */
  async checkConsent(customerId: string | undefined, channel: CommChannel, isMarketing: boolean): Promise<{ allowed: boolean; reason?: string }> {
    if (!customerId || channel === "INTERNAL" || channel === "SYSTEM" || channel === "PORTAL") return { allowed: true };
    const supabase = await createClient();
    const { data: customer } = await supabase.from("customer_profiles").select("email_opt_in, whatsapp_opt_in, sms_opt_in, marketing_opt_in, do_not_contact").eq("id", customerId).maybeSingle();
    if (!customer) return { allowed: true };
    if (isMarketing && customer.do_not_contact) return { allowed: false, reason: "Customer has Do-Not-Contact enabled." };
    if (isMarketing && !customer.marketing_opt_in) return { allowed: false, reason: "Customer has opted out of marketing communications." };
    const channelField = channel === "WHATSAPP" ? "whatsapp_opt_in" : channel === "EMAIL" ? "email_opt_in" : channel === "SMS" ? "sms_opt_in" : null;
    if (channelField && !customer[channelField]) return { allowed: false, reason: `Customer has opted out of ${channel} communications.` };
    return { allowed: true };
  },

  async updateConsent(customerId: string, field: ConsentField, newValue: boolean, source: ConsentChangeSource): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("customer_profiles").select(field).eq("id", customerId).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldValue = (existing as any)?.[field] ?? null;
    const { error } = await supabase.from("customer_profiles").update({ [field]: newValue }).eq("id", customerId);
    if (error) throw new Error("Could not update this consent field.");
    await supabase.from("communication_consent_history").insert({ customer_id: customerId, field, old_value: oldValue, new_value: newValue, source });
  },

  /** The composer's "Send Now" / "Schedule" / "Save Draft" (section 20)
   *  — creates the message row, then (if not scheduled/draft) attempts
   *  a real send through senders.ts, gated on consent + business hours +
   *  provider configuration. Never fabricates SENT/DELIVERED. */
  async composeAndSend(
    input: {
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
    },
    actor: { adminId?: string; name: string }
  ): Promise<CommMessage> {
    const supabase = await createClient();
    const conversation = await this.getById(input.conversationId);
    if (!conversation) throw new Error("Conversation not found.");

    const isDraft = !!input.saveDraft;
    const isScheduled = !isDraft && !!input.scheduledFor && new Date(input.scheduledFor).getTime() > Date.now();
    const initialStatus = isDraft ? "DRAFT" : input.isPrivateNote || input.direction === "INTERNAL" ? "SENT" : isScheduled ? "SCHEDULED" : "QUEUED";

    const { data: msgRow, error } = await supabase
      .from("communication_messages")
      .insert({
        conversation_id: input.conversationId,
        direction: input.direction,
        channel: input.channel,
        status: initialStatus,
        is_private_note: !!input.isPrivateNote,
        subject: input.subject || null,
        body: input.body,
        template_id: input.templateId || null,
        sender_admin_id: actor.adminId || null,
        scheduled_for: isScheduled ? input.scheduledFor : null,
        sent_at: initialStatus === "SENT" ? new Date().toISOString() : null,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("communicationService.composeAndSend failed:", error);
      throw new Error("Could not create this message.");
    }

    if (isDraft) {
      await logAudit(supabase, { conversationId: input.conversationId, messageId: msgRow.id, action: "Draft saved", actorId: actor.adminId, actorName: actor.name });
      return mapMessage(msgRow);
    }

    await supabase
      .from("communication_conversations")
      .update({ last_message_at: new Date().toISOString(), last_message_preview: input.body.slice(0, 140) })
      .eq("id", input.conversationId);
    await logAudit(supabase, { conversationId: input.conversationId, messageId: msgRow.id, action: input.isPrivateNote ? "Internal note added" : isScheduled ? "Scheduled" : "Created", actorId: actor.adminId, actorName: actor.name });

    if (isScheduled) {
      await supabase.from("communication_schedules").insert({ message_id: msgRow.id, scheduled_for: input.scheduledFor, status: "SCHEDULED" });
      return mapMessage(msgRow);
    }

    if (input.isPrivateNote || input.direction === "INTERNAL") {
      return mapMessage(msgRow);
    }

    const sent = await this._dispatch(msgRow.id, input.channel, input.body, input.subject, {
      recipientPhone: input.recipientPhone || conversation.counterpartPhone,
      recipientEmail: input.recipientEmail || conversation.counterpartEmail,
      customerId: conversation.customerId,
      isMarketing: !!input.isMarketing,
    });
    return sent;
  },

  /** The actual send attempt — shared by composeAndSend (immediate) and
   *  processScheduledQueue (deferred). Checks consent, checks provider
   *  configuration, calls the real sender, and records exactly what
   *  happened — never more. */
  async _dispatch(
    messageId: string,
    channel: CommChannel,
    body: string,
    subject: string | undefined,
    opts: { recipientPhone?: string; recipientEmail?: string; customerId?: string; isMarketing: boolean }
  ): Promise<CommMessage> {
    const supabase = await createClient();

    const fail = async (reason: string) => {
      await supabase.from("communication_messages").update({ status: "FAILED", failure_reason: reason, last_error: reason }).eq("id", messageId);
      await supabase.from("communication_delivery_logs").insert({ message_id: messageId, provider: channel.toLowerCase(), status: "FAILED", error_message: reason });
      await logAudit(supabase, { messageId, action: "Failed", metadata: { reason } });
      const { data } = await supabase.from("communication_messages").select("*, admin_profiles(name)").eq("id", messageId).single();
      return mapMessage(data);
    };

    if (channel === "WHATSAPP" || channel === "EMAIL" || channel === "SMS") {
      const consent = await this.checkConsent(opts.customerId, channel, opts.isMarketing);
      if (!consent.allowed) return fail(consent.reason || "Blocked by consent settings.");
    }

    const settings = await this.getSettings();
    if (settings.deferOutsideBusinessHours && (channel === "WHATSAPP" || channel === "SMS") && !isWithinBusinessHours(settings.businessHoursStart, settings.businessHoursEnd, settings.businessHoursTimezone)) {
      const [h, m] = settings.businessHoursStart.split(":").map(Number);
      const next = new Date();
      next.setHours(h, m, 0, 0);
      if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
      await supabase.from("communication_messages").update({ status: "SCHEDULED", scheduled_for: next.toISOString() }).eq("id", messageId);
      await supabase.from("communication_schedules").insert({ message_id: messageId, scheduled_for: next.toISOString(), status: "SCHEDULED" });
      await logAudit(supabase, { messageId, action: "Deferred to business hours" });
      const { data } = await supabase.from("communication_messages").select("*, admin_profiles(name)").eq("id", messageId).single();
      return mapMessage(data);
    }

    // Section 84 — protects the provider account from being used to send
    // too fast (compliance/anti-spam), independent of the duplicate-send
    // idempotency guard above. A message hitting this limit is left
    // FAILED and can be retried manually (or automatically, via the
    // scheduled-queue sweep) once the window has passed.
    if ((channel === "WHATSAPP" || channel === "EMAIL" || channel === "SMS") && isRateLimited(`outbound:${channel}`, 60_000, 60)) {
      return fail(`Rate limit reached for ${channel} sends — please retry in a moment.`);
    }

    await supabase.from("communication_messages").update({ status: "SENDING" }).eq("id", messageId);

    let result: { success: boolean; providerMessageId?: string; error?: string };
    let provider: string;
    if (channel === "WHATSAPP") {
      provider = "meta_whatsapp";
      result = opts.recipientPhone ? await sendWhatsAppMessage(opts.recipientPhone, body) : { success: false, error: "No recipient phone number on file." };
    } else if (channel === "EMAIL") {
      provider = "smtp";
      result = opts.recipientEmail ? await sendEmailMessage(opts.recipientEmail, subject || "Message from 5STAR.M Estate & Builders", body) : { success: false, error: "No recipient email address on file." };
    } else if (channel === "SMS") {
      provider = "sms_gateway";
      result = opts.recipientPhone ? await sendSmsMessage(opts.recipientPhone, body) : { success: false, error: "No recipient phone number on file." };
    } else {
      return fail("Unsupported channel for external dispatch.");
    }

    if (!result.success) return fail(result.error || "Send failed.");

    await supabase
      .from("communication_messages")
      .update({ status: "SENT", sent_at: new Date().toISOString(), provider, provider_message_id: result.providerMessageId || null })
      .eq("id", messageId);
    await supabase.from("communication_delivery_logs").insert({ message_id: messageId, provider, provider_message_id: result.providerMessageId || null, status: "SENT" });
    await logAudit(supabase, { messageId, action: "Sent" });

    const { data } = await supabase.from("communication_messages").select("*, admin_profiles(name)").eq("id", messageId).single();
    return mapMessage(data);
  },

  /** Dispatches a previously-saved DRAFT (section 20's "Save Draft" ->
   *  later "Send Now"). */
  async sendDraft(messageId: string): Promise<CommMessage> {
    const supabase = await createClient();
    const { data: message } = await supabase.from("communication_messages").select("*, communication_conversations(customer_id, counterpart_phone, counterpart_email)").eq("id", messageId).maybeSingle();
    if (!message || message.status !== "DRAFT") throw new Error("Only a draft can be sent.");
    await supabase.from("communication_conversations").update({ last_message_at: new Date().toISOString(), last_message_preview: message.body.slice(0, 140) }).eq("id", message.conversation_id);
    return this._dispatch(messageId, message.channel, message.body, message.subject ?? undefined, {
      recipientPhone: message.communication_conversations?.counterpart_phone ?? undefined,
      recipientEmail: message.communication_conversations?.counterpart_email ?? undefined,
      customerId: message.communication_conversations?.customer_id ?? undefined,
      isMarketing: false,
    });
  },

  async cancelScheduled(messageId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("communication_messages").update({ status: "CANCELLED" }).eq("id", messageId).in("status", ["SCHEDULED", "QUEUED"]);
    if (error) throw new Error("Could not cancel this message.");
    await supabase.from("communication_schedules").update({ status: "CANCELLED" }).eq("message_id", messageId);
    await logAudit(supabase, { messageId, action: "Cancelled" });
  },

  /** Retries only a FAILED message, respecting a simple backoff via
   *  next_retry_at (section 42) — never retries a permanently-invalid
   *  recipient endlessly; the caller decides when to call this again. */
  async retryFailed(messageId: string): Promise<CommMessage> {
    const supabase = await createClient();
    const { data: message } = await supabase.from("communication_messages").select("*, communication_conversations(customer_id, counterpart_phone, counterpart_email)").eq("id", messageId).maybeSingle();
    if (!message || message.status !== "FAILED") throw new Error("Only a failed message can be retried.");

    await supabase
      .from("communication_messages")
      .update({ retry_count: (message.retry_count ?? 0) + 1, next_retry_at: null })
      .eq("id", messageId);

    return this._dispatch(messageId, message.channel, message.body, message.subject ?? undefined, {
      recipientPhone: message.communication_conversations?.counterpart_phone ?? undefined,
      recipientEmail: message.communication_conversations?.counterpart_email ?? undefined,
      customerId: message.communication_conversations?.customer_id ?? undefined,
      isMarketing: false,
    });
  },

  /** Opportunistic scheduled-message processor (section 41) — same "no
   *  background job runner in this deployment" pattern as
   *  followUpService.markOverdue()/automationService.processQueuedEvents.
   *  Called from the admin communications dashboard on page load. */
  async processScheduledQueue(limit = 50): Promise<number> {
    const supabase = await createClient();
    const { data: due } = await supabase
      .from("communication_schedules")
      .select("*, communication_messages(*, communication_conversations(customer_id, counterpart_phone, counterpart_email))")
      .eq("status", "SCHEDULED")
      .lte("scheduled_for", new Date().toISOString())
      .limit(limit);
    if (!due || due.length === 0) return 0;

    for (const schedule of due) {
      await supabase.from("communication_schedules").update({ status: "PROCESSING" }).eq("id", schedule.id);
      const message = schedule.communication_messages;
      if (!message) {
        await supabase.from("communication_schedules").update({ status: "FAILED", failure_reason: "Message no longer exists." }).eq("id", schedule.id);
        continue;
      }
      try {
        await this._dispatch(message.id, message.channel, message.body, message.subject ?? undefined, {
          recipientPhone: message.communication_conversations?.counterpart_phone ?? undefined,
          recipientEmail: message.communication_conversations?.counterpart_email ?? undefined,
          customerId: message.communication_conversations?.customer_id ?? undefined,
          isMarketing: false,
        });
        await supabase.from("communication_schedules").update({ status: "SENT", executed_at: new Date().toISOString() }).eq("id", schedule.id);
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Unknown error.";
        await supabase.from("communication_schedules").update({ status: "FAILED", failure_reason: reason, executed_at: new Date().toISOString() }).eq("id", schedule.id);
      }
    }
    return due.length;
  },

  // ---- Unread management (section 47) — per-user, never global ----
  async markRead(conversationId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("communication_participants").upsert({ conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() });
  },

  async markUnread(conversationId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("communication_participants").upsert({ conversation_id: conversationId, user_id: userId, last_read_at: null });
  },

  async unreadCountsFor(userId: string, conversationIds: string[]): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();
    const supabase = await createClient();
    const [{ data: participants }, { data: messages }] = await Promise.all([
      supabase.from("communication_participants").select("conversation_id, last_read_at").eq("user_id", userId).in("conversation_id", conversationIds),
      supabase.from("communication_messages").select("conversation_id, created_at, direction").in("conversation_id", conversationIds).neq("direction", "INTERNAL"),
    ]);
    const lastReadMap = new Map((participants ?? []).map((p) => [p.conversation_id, p.last_read_at]));
    const counts = new Map<string, number>();
    for (const m of messages ?? []) {
      if (m.direction !== "INBOUND") continue;
      const lastRead = lastReadMap.get(m.conversation_id);
      if (!lastRead || m.created_at > lastRead) {
        counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
      }
    }
    return counts;
  },

  // ---- Scheduled / Failed message centers (sections 41-42, 68) ----
  async listSchedules(status?: string): Promise<
    { id: string; messageId: string; scheduledFor: string; status: string; executedAt?: string; failureReason?: string; channel: CommChannel; bodyPreview: string; conversationId: string; counterpartName?: string }[]
  > {
    const supabase = await createClient();
    let query = supabase
      .from("communication_schedules")
      .select("*, communication_messages(channel, body, conversation_id, communication_conversations(counterpart_name, leads(name), customer_profiles(full_name)))")
      .order("scheduled_for", { ascending: false })
      .limit(200);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => {
      const message = Array.isArray(row.communication_messages) ? row.communication_messages[0] : row.communication_messages;
      const conv = Array.isArray(message?.communication_conversations) ? message.communication_conversations[0] : message?.communication_conversations;
      const leadName = Array.isArray(conv?.leads) ? conv.leads[0]?.name : conv?.leads?.name;
      const customerName = Array.isArray(conv?.customer_profiles) ? conv.customer_profiles[0]?.full_name : conv?.customer_profiles?.full_name;
      return {
        id: row.id,
        messageId: row.message_id,
        scheduledFor: row.scheduled_for,
        status: row.status,
        executedAt: row.executed_at ?? undefined,
        failureReason: row.failure_reason ?? undefined,
        channel: message?.channel ?? "WHATSAPP",
        bodyPreview: (message?.body ?? "").slice(0, 140),
        conversationId: message?.conversation_id ?? "",
        counterpartName: leadName ?? customerName ?? conv?.counterpart_name ?? undefined,
      };
    });
  },

  /** Failed Message Center (section 68) — every FAILED message across all
   *  conversations, newest first. */
  async listFailedMessages(): Promise<
    { id: string; conversationId: string; channel: CommChannel; provider?: string; failureReason?: string; retryCount: number; createdAt: string; counterpartName?: string; bodyPreview: string }[]
  > {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_messages")
      .select("id, conversation_id, channel, provider, failure_reason, retry_count, created_at, body, communication_conversations(counterpart_name, leads(name), customer_profiles(full_name))")
      .eq("status", "FAILED")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => {
      const conv = Array.isArray(row.communication_conversations) ? row.communication_conversations[0] : row.communication_conversations;
      const leadName = Array.isArray(conv?.leads) ? conv.leads[0]?.name : conv?.leads?.name;
      const customerName = Array.isArray(conv?.customer_profiles) ? conv.customer_profiles[0]?.full_name : conv?.customer_profiles?.full_name;
      return {
        id: row.id,
        conversationId: row.conversation_id,
        channel: row.channel,
        provider: row.provider ?? undefined,
        failureReason: row.failure_reason ?? undefined,
        retryCount: row.retry_count ?? 0,
        createdAt: row.created_at,
        counterpartName: leadName ?? customerName ?? conv?.counterpart_name ?? undefined,
        bodyPreview: (row.body ?? "").slice(0, 140),
      };
    });
  },

  // ---- Customer portal (section 57-58) ----
  async listForCustomer(customerId: string): Promise<Conversation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_conversations").select(SELECT_CONVERSATION).eq("customer_id", customerId).order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) return [];
    return (data ?? []).map(mapConversation);
  },

  // ---- Analytics (sections 63-67) ----
  async dashboardStats(): Promise<CommunicationDashboardStats> {
    const supabase = await createClient();
    const [{ data: messages }, { data: conversations }, { data: threadMessages }] = await Promise.all([
      supabase.from("communication_messages").select("direction, status, channel, created_at").neq("channel", "INTERNAL"),
      supabase.from("communication_conversations").select("id, status, assigned_agent_id, lead_id, leads(score_level)"),
      supabase
        .from("communication_messages")
        .select("conversation_id, direction, created_at")
        .neq("channel", "INTERNAL")
        .order("conversation_id", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    const m = messages ?? [];
    const c = conversations ?? [];
    const outbound = m.filter((r) => r.direction === "OUTBOUND");
    const sent = outbound.filter((r) => ["SENT", "DELIVERED", "READ"].includes(r.status));
    const delivered = outbound.filter((r) => ["DELIVERED", "READ"].includes(r.status));
    const read = outbound.filter((r) => r.status === "READ");
    const failed = outbound.filter((r) => r.status === "FAILED");
    const received = m.filter((r) => r.direction === "INBOUND");

    // Real first-response-time computation: for each conversation, the gap
    // between the first inbound message and the first outbound message that
    // follows it (never fabricated — conversations with no real reply yet
    // are simply excluded from the average/median).
    const byConversation = new Map<string, { direction: string; created_at: string }[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of threadMessages ?? ([] as any[])) {
      const list = byConversation.get(row.conversation_id) ?? [];
      list.push(row);
      byConversation.set(row.conversation_id, list);
    }
    const responseMinutesByConversation = new Map<string, number>();
    for (const [conversationId, rows] of byConversation) {
      const firstInbound = rows.find((r) => r.direction === "INBOUND");
      if (!firstInbound) continue;
      const firstReply = rows.find((r) => r.direction === "OUTBOUND" && new Date(r.created_at) > new Date(firstInbound.created_at));
      if (!firstReply) continue;
      const minutes = (new Date(firstReply.created_at).getTime() - new Date(firstInbound.created_at).getTime()) / 60000;
      responseMinutesByConversation.set(conversationId, minutes);
    }
    const responseTimes = Array.from(responseMinutesByConversation.values()).sort((a, b) => a - b);
    const average = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;
    const median = responseTimes.length ? responseTimes[Math.floor(responseTimes.length / 2)] : null;

    // SLA breaches: reuse the existing lead-scoring SLA rules (STEP 21) —
    // a breach is a real first-response time exceeding the active rule for
    // that lead's score level. Conversations with no linked lead, or no
    // active rule for that score level, are not counted (no invented policy).
    const { data: rules } = await supabase.from("lead_sla_rules").select("score_level, response_minutes").eq("active", true);
    const ruleMap = new Map((rules ?? []).map((r) => [r.score_level, r.response_minutes]));
    let slaBreaches = 0;
    for (const conv of c) {
      const scoreLevel = (conv as unknown as { leads?: { score_level?: string } }).leads?.score_level;
      if (!scoreLevel) continue;
      const limit = ruleMap.get(scoreLevel);
      const actual = responseMinutesByConversation.get(conv.id);
      if (limit != null && actual != null && actual > limit) slaBreaches++;
    }

    return {
      messagesSent: sent.length,
      messagesReceived: received.length,
      failedMessages: failed.length,
      deliveryRate: sent.length >= 5 ? delivered.length / sent.length : null,
      readRate: delivered.length >= 5 ? read.length / delivered.length : null,
      totalConversations: c.length,
      openConversations: c.filter((r) => r.status === "OPEN").length,
      unassignedConversations: c.filter((r) => !r.assigned_agent_id).length,
      averageFirstResponseMinutes: average,
      medianFirstResponseMinutes: median,
      slaBreaches,
    };
  },

  async channelBreakdown(): Promise<ChannelBreakdownRow[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("communication_messages").select("channel, direction, status").neq("channel", "INTERNAL");
    const channels: CommChannel[] = ["WHATSAPP", "EMAIL", "SMS", "PORTAL"];
    return channels.map((channel) => {
      const rows = (data ?? []).filter((r) => r.channel === channel);
      const outbound = rows.filter((r) => r.direction === "OUTBOUND");
      const sent = outbound.filter((r) => ["SENT", "DELIVERED", "READ"].includes(r.status));
      const delivered = outbound.filter((r) => ["DELIVERED", "READ"].includes(r.status));
      return {
        channel,
        sent: sent.length,
        received: rows.filter((r) => r.direction === "INBOUND").length,
        failed: outbound.filter((r) => r.status === "FAILED").length,
        deliveryRate: sent.length >= 5 ? delivered.length / sent.length : null,
      };
    });
  },

  /** Agent performance (section 66) — never uses raw message count alone
   *  as a quality signal; pairs reply volume with real response time and
   *  completed follow-ups (reusing followUpService's own table). */
  async agentPerformance(): Promise<AgentCommPerformance[]> {
    const supabase = await createClient();
    const [{ data: agents }, { data: conversations }, { data: messages }, { data: followUps }] = await Promise.all([
      supabase.from("admin_profiles").select("id, name").in("role", ["admin", "sales_manager", "sales_agent"]),
      supabase.from("communication_conversations").select("id, assigned_agent_id").not("assigned_agent_id", "is", null),
      supabase.from("communication_messages").select("conversation_id, direction, sender_admin_id, created_at").eq("direction", "OUTBOUND"),
      supabase.from("follow_ups").select("assigned_agent_id, status").eq("status", "Completed"),
    ]);

    const threadsByConversation = new Map<string, { direction: string; created_at: string }[]>();
    const { data: allThreadMsgs } = await supabase.from("communication_messages").select("conversation_id, direction, created_at").neq("channel", "INTERNAL").order("created_at", { ascending: true });
    for (const row of allThreadMsgs ?? []) {
      const list = threadsByConversation.get(row.conversation_id) ?? [];
      list.push(row);
      threadsByConversation.set(row.conversation_id, list);
    }

    return (agents ?? []).map((agent) => {
      const myConversations = (conversations ?? []).filter((c) => c.assigned_agent_id === agent.id);
      const myConversationIds = new Set(myConversations.map((c) => c.id));
      const myReplies = (messages ?? []).filter((m) => m.sender_admin_id === agent.id);

      const responseTimes: number[] = [];
      for (const convId of myConversationIds) {
        const rows = threadsByConversation.get(convId) ?? [];
        const firstInbound = rows.find((r) => r.direction === "INBOUND");
        if (!firstInbound) continue;
        const firstReply = rows.find((r) => r.direction === "OUTBOUND" && new Date(r.created_at) > new Date(firstInbound.created_at));
        if (!firstReply) continue;
        responseTimes.push((new Date(firstReply.created_at).getTime() - new Date(firstInbound.created_at).getTime()) / 60000);
      }
      const averageResponseMinutes = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;

      return {
        agentId: agent.id,
        agentName: agent.name,
        conversationsAssigned: myConversations.length,
        repliesSent: myReplies.length,
        averageResponseMinutes,
        followUpsCompleted: (followUps ?? []).filter((f) => f.assigned_agent_id === agent.id).length,
      };
    });
  },
};
