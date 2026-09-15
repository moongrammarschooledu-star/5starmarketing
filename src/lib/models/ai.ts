// STEP 30 — AI Assistant + Automation: shared types.
// Mirrors this codebase's plain-interface model style (see lead.ts, support.ts).

export type AssistantType =
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "RENTAL"
  | "CONSTRUCTION"
  | "ACCOUNTING"
  | "CUSTOMER_PORTAL";

export const assistantTypes: AssistantType[] = [
  "ADMIN",
  "SALES",
  "SUPPORT",
  "RENTAL",
  "CONSTRUCTION",
  "ACCOUNTING",
  "CUSTOMER_PORTAL",
];

export const assistantLabels: Record<AssistantType, string> = {
  ADMIN: "Admin AI",
  SALES: "Sales AI",
  SUPPORT: "Customer Support AI",
  RENTAL: "Rental AI",
  CONSTRUCTION: "Construction AI",
  ACCOUNTING: "Accounting AI",
  CUSTOMER_PORTAL: "Customer Portal AI",
};

export const AI_TOOL_NAMES = [
  "search_properties",
  "get_property_details",
  "search_leads",
  "get_lead_summary",
  "get_customer_summary",
  "get_deal_summary",
  "get_rental_summary",
  "get_lease_summary",
  "get_payment_status",
  "get_support_ticket",
  "search_knowledge_base",
  "get_construction_project_summary",
  "get_maintenance_summary",
  "get_business_dashboard_summary",
  "generate_report_summary",
] as const;
export type AiToolName = (typeof AI_TOOL_NAMES)[number];

export interface AiAssistantConfig {
  id: string;
  assistantType: AssistantType | "GLOBAL";
  enabled: boolean;
  allowedTools: string[];
  allowWriteActions: boolean;
  requireApprovalForWrite: boolean;
  conversationRetentionDays: number;
  dailyRequestLimit: number | null;
  model: string;
  systemNotes: string | null;
  updatedAt: string;
}

export interface AiConversation {
  id: string;
  assistantType: AssistantType;
  adminId: string | null;
  customerId: string | null;
  title: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AiMessageRole = "user" | "assistant" | "system" | "tool";

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  sourceReferences: AiSourceReference[];
  feedback?: "up" | "down" | null;
  createdAt: string;
}

export interface AiSourceReference {
  type: string;
  id: string;
  label: string;
  href?: string;
}

export type ActionTier = "SUGGESTED" | "CONFIRMED";
export type ActionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED" | "FAILED" | "CANCELLED";

export interface AiActionRequest {
  id: string;
  conversationId: string | null;
  requestedByAdminId: string | null;
  requestedByCustomerId: string | null;
  assistantType: AssistantType;
  actionType: string;
  tier: ActionTier;
  targetTable: string | null;
  targetRecordId: string | null;
  summary: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  executedAt: string | null;
  executionResult: unknown;
  createdAt: string;
}

export type AutomationTrigger =
  | "NEW_LEAD"
  | "LEAD_INACTIVE"
  | "NEW_INQUIRY"
  | "RENT_OVERDUE"
  | "LEASE_EXPIRY"
  | "SUPPORT_TICKET_CREATED"
  | "SLA_RISK"
  | "CONSTRUCTION_DELAY"
  | "MAINTENANCE_REQUEST"
  | "PAYMENT_RECEIVED"
  | "DOCUMENT_EXPIRY";

export type AutomationAction =
  | "CREATE_TASK"
  | "CREATE_NOTIFICATION"
  | "SUGGEST_DRAFT"
  | "ASSIGN_QUEUE"
  | "REQUEST_HUMAN_REVIEW";

export interface AiAutomationRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: AutomationTrigger;
  conditions: Record<string, unknown>;
  actionType: AutomationAction;
  actionConfig: Record<string, unknown>;
  requiresApproval: boolean;
  isEnabled: boolean;
  createdAt: string;
}

export interface AiAutomationRun {
  id: string;
  ruleId: string;
  triggerContext: Record<string, unknown>;
  idempotencyKey: string;
  status: "PENDING" | "ANALYZED" | "SUGGESTED" | "AWAITING_APPROVAL" | "EXECUTED" | "SKIPPED" | "FAILED";
  aiAnalysis: string | null;
  suggestedAction: unknown;
  actionRequestId: string | null;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface AiInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  dataSource: string;
  timePeriod: string;
  reason: string;
  relatedRecords: AiSourceReference[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ACKNOWLEDGED" | "DISMISSED";
  generatedAt: string;
}

export interface AiKnowledgeSource {
  id: string;
  title: string;
  content: string;
  sourceType: "MANUAL" | "FAQ" | "POLICY" | "DOCUMENT";
  department: string | null;
  visibility: "INTERNAL" | "CUSTOMER";
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolLog {
  id: string;
  conversationId: string | null;
  actorAdminId: string | null;
  actorCustomerId: string | null;
  assistantType: string;
  toolName: string;
  input: Record<string, unknown>;
  recordIds: string[];
  status: "SUCCESS" | "DENIED" | "ERROR";
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

/** Who is currently issuing an AI request — resolved server-side only,
 *  never trusted from the client. */
export interface AiActor {
  kind: "admin" | "customer";
  id: string;
  name: string;
  role?: string; // AdminRole, when kind === "admin"
}
