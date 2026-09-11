// ---------------------------------------------------------------------
// Communication Center (STEP 22) — a unified conversation/message model
// layered ON TOP OF (never replacing) communication_log (STEP 17, a
// lead-scoped manual contact log line) and whatsapp_activity (STEP 6,
// manual bulk click-to-chat tracking). marketing_templates (STEP 21) is
// reused directly as the one template library for both automation and
// the manual composer built here.
// ---------------------------------------------------------------------

export type CommChannel = "WHATSAPP" | "EMAIL" | "SMS" | "INTERNAL" | "PORTAL" | "SYSTEM";
export const commChannels: CommChannel[] = ["WHATSAPP", "EMAIL", "SMS", "INTERNAL", "PORTAL", "SYSTEM"];

export type MessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

/** Only DELIVERED/READ are ever set from a real, signature-verified
 *  provider webhook event (section 10) — never fabricated by app code. */
export type MessageStatus = "DRAFT" | "QUEUED" | "SCHEDULED" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED";
export const messageStatuses: MessageStatus[] = ["DRAFT", "QUEUED", "SCHEDULED", "SENDING", "SENT", "DELIVERED", "READ", "FAILED", "CANCELLED"];

export type ConversationStatus = "OPEN" | "CLOSED" | "ARCHIVED";
export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export const conversationPriorities: ConversationPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export interface Conversation {
  id: string;
  channel: CommChannel;
  subject?: string;
  leadId?: string;
  leadName?: string;
  customerId?: string;
  customerName?: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  dealId?: string;
  dealNumber?: string;
  siteVisitId?: string;
  paymentId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  priorityOverridden: boolean;
  counterpartName?: string;
  counterpartPhone?: string;
  counterpartEmail?: string;
  isUnmatched: boolean;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ConversationInput = Pick<
  Conversation,
  "channel" | "subject" | "leadId" | "customerId" | "propertyId" | "projectId" | "dealId" | "siteVisitId" | "paymentId" | "counterpartName" | "counterpartPhone" | "counterpartEmail"
>;

export interface CommMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  channel: CommChannel;
  status: MessageStatus;
  isPrivateNote: boolean;
  subject?: string;
  body: string;
  templateId?: string;
  senderAdminId?: string;
  senderAdminName?: string;
  senderCustomerId?: string;
  provider?: string;
  providerMessageId?: string;
  scheduledFor?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  retryCount: number;
  lastError?: string;
  attachments?: CommAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommAttachment {
  id: string;
  messageId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface DeliveryLogEntry {
  id: string;
  messageId: string;
  provider: string;
  providerMessageId?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export type ScheduleStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";

export interface MessageSchedule {
  id: string;
  messageId: string;
  scheduledFor: string;
  timezone: string;
  status: ScheduleStatus;
  executedAt?: string;
  failureReason?: string;
  createdAt: string;
}

export type CallOutcome = "CONNECTED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED" | "NOT_INTERESTED" | "WRONG_NUMBER" | "OTHER";
export const callOutcomes: CallOutcome[] = ["CONNECTED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED", "NOT_INTERESTED", "WRONG_NUMBER", "OTHER"];

export interface CallLogEntry {
  id: string;
  conversationId?: string;
  leadId?: string;
  customerId?: string;
  agentId?: string;
  agentName?: string;
  direction: "Outgoing" | "Incoming";
  outcome: CallOutcome;
  durationSeconds?: number;
  notes?: string;
  nextFollowUpAt?: string;
  source: "MANUAL_LOG";
  createdAt: string;
}

export type CallLogInput = Pick<CallLogEntry, "conversationId" | "leadId" | "customerId" | "direction" | "outcome" | "durationSeconds" | "notes" | "nextFollowUpAt">;

export interface CommAuditLogEntry {
  id: string;
  conversationId?: string;
  messageId?: string;
  action: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ConsentField = "email_opt_in" | "whatsapp_opt_in" | "sms_opt_in" | "marketing_opt_in" | "do_not_contact";
export type ConsentChangeSource = "customer" | "admin" | "stop_keyword" | "system";

export interface ConsentHistoryEntry {
  id: string;
  customerId: string;
  field: ConsentField;
  oldValue?: boolean;
  newValue: boolean;
  source: ConsentChangeSource;
  createdAt: string;
}

export interface AssignmentHistoryEntry {
  id: string;
  conversationId: string;
  previousAgentId?: string;
  previousAgentName?: string;
  newAgentId?: string;
  newAgentName?: string;
  changedBy?: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

export interface CommunicationSettings {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  testMode: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessHoursTimezone: string;
  deferOutsideBusinessHours: boolean;
  updatedAt: string;
}

export type CommunicationSettingsInput = Partial<Omit<CommunicationSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// Search / filters (sections 52-53)
// ---------------------------------------------------------------------
export const DEFAULT_CONVERSATION_PAGE_SIZE = 20;
export const MAX_CONVERSATION_PAGE_SIZE = 100;

export interface ConversationSearchFilters {
  q?: string;
  channel?: CommChannel;
  agentId?: string;
  unassigned?: boolean;
  unreadOnly?: boolean;
  priority?: ConversationPriority;
  status?: ConversationStatus;
  unmatchedOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ConversationSearchResult {
  conversations: Conversation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Analytics (sections 63-67)
// ---------------------------------------------------------------------
export interface CommunicationDashboardStats {
  messagesSent: number;
  messagesReceived: number;
  failedMessages: number;
  deliveryRate: number | null;
  readRate: number | null;
  totalConversations: number;
  openConversations: number;
  unassignedConversations: number;
  averageFirstResponseMinutes: number | null;
  medianFirstResponseMinutes: number | null;
  slaBreaches: number;
}

export interface ChannelBreakdownRow {
  channel: CommChannel;
  sent: number;
  received: number;
  failed: number;
  deliveryRate: number | null;
}

/** Real deal-financial values for the composer's {{deal_amount}}/
 *  {{payment_amount}}/{{outstanding_amount}}/{{due_date}} template
 *  variables (section 26) — see lib/communication/dealContext.ts. */
export interface ComposerDealContext {
  dealAmount?: string;
  paymentAmount?: string;
  outstandingAmount?: string;
  dueDate?: string;
}

export interface AgentCommPerformance {
  agentId: string;
  agentName: string;
  conversationsAssigned: number;
  repliesSent: number;
  averageResponseMinutes: number | null;
  followUpsCompleted: number;
}
