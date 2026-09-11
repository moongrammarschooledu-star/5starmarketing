/** Automation trigger types (section 21). Every one of these is either
 *  fired synchronously from a real app-level call site (deals,
 *  appointments, lead status changes) or — for NEW_LEAD and the handful
 *  of lead-type-derived triggers an anonymous visitor's own insert can
 *  reach before any app code sees the row — drained from
 *  `automation_queue` opportunistically (see automationService). Not
 *  every trigger listed here has an active call site yet in this
 *  deployment; automationService documents which ones do. */
export type AutomationTriggerType =
  | "NEW_LEAD"
  | "LEAD_SCORE_CHANGED"
  | "LEAD_STATUS_CHANGED"
  | "LEAD_CONVERTED"
  | "SITE_VISIT_BOOKED"
  | "SITE_VISIT_COMPLETED"
  | "BROCHURE_REQUESTED"
  | "PAYMENT_PLAN_REQUESTED"
  | "INVESTMENT_INQUIRY"
  | "DEAL_CREATED"
  | "DEAL_BOOKED"
  | "PAYMENT_OVERDUE"
  | "CUSTOMER_CREATED"
  | "DOCUMENT_REQUIRED";

export const automationTriggerTypes: AutomationTriggerType[] = [
  "NEW_LEAD",
  "LEAD_SCORE_CHANGED",
  "LEAD_STATUS_CHANGED",
  "LEAD_CONVERTED",
  "SITE_VISIT_BOOKED",
  "SITE_VISIT_COMPLETED",
  "BROCHURE_REQUESTED",
  "PAYMENT_PLAN_REQUESTED",
  "INVESTMENT_INQUIRY",
  "DEAL_CREATED",
  "DEAL_BOOKED",
  "PAYMENT_OVERDUE",
  "CUSTOMER_CREATED",
  "DOCUMENT_REQUIRED",
];

/** Triggers this deployment actually fires from a real event today —
 *  the rest are supported architecture (a workflow CAN be created for
 *  them, and they'll run the moment a real call site is wired up) but
 *  never invoked, so the admin UI can honestly label them. */
export const activelyFiredTriggers: AutomationTriggerType[] = [
  "NEW_LEAD",
  "LEAD_SCORE_CHANGED",
  "LEAD_STATUS_CHANGED",
  "LEAD_CONVERTED",
  "SITE_VISIT_BOOKED",
  "SITE_VISIT_COMPLETED",
  "BROCHURE_REQUESTED",
  "PAYMENT_PLAN_REQUESTED",
  "INVESTMENT_INQUIRY",
  "DEAL_CREATED",
  "DEAL_BOOKED",
  "PAYMENT_OVERDUE",
];

export type AutomationActionType =
  | "CREATE_TASK"
  | "ASSIGN_AGENT"
  | "CHANGE_PRIORITY"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "CREATE_NOTIFICATION"
  | "SEND_EMAIL"
  | "SEND_WHATSAPP"
  | "SEND_SMS"
  | "CREATE_FOLLOWUP"
  | "UPDATE_STATUS";

export const automationActionTypes: AutomationActionType[] = [
  "CREATE_TASK",
  "ASSIGN_AGENT",
  "CHANGE_PRIORITY",
  "ADD_TAG",
  "REMOVE_TAG",
  "CREATE_NOTIFICATION",
  "SEND_EMAIL",
  "SEND_WHATSAPP",
  "SEND_SMS",
  "CREATE_FOLLOWUP",
  "UPDATE_STATUS",
];

export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | string[];
}

export interface MarketingWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  conditions: WorkflowCondition[];
  active: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketingWorkflowInput = Pick<MarketingWorkflow, "name" | "description" | "triggerType" | "conditions" | "active">;

export interface WorkflowAction {
  id: string;
  workflowId: string;
  sortOrder: number;
  actionType: AutomationActionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionConfig: Record<string, any>;
  createdAt: string;
}

export type WorkflowActionInput = Pick<WorkflowAction, "actionType" | "actionConfig" | "sortOrder">;

export type AutomationLogStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";

export interface AutomationLogEntry {
  id: string;
  workflowId?: string;
  workflowName?: string;
  triggerType: string;
  leadId?: string;
  leadName?: string;
  actionType?: string;
  status: AutomationLogStatus;
  error?: string;
  executedAt: string;
}

// ---------------------------------------------------------------------
// Follow-up rules (sections 18-19) — admin-configurable scheduling,
// distinct from the ad-hoc follow_ups an agent creates by hand.
// ---------------------------------------------------------------------
export type FollowUpTriggerEvent =
  | "LEAD_CREATED"
  | "LEAD_QUALIFIED"
  | "SITE_VISIT_REQUESTED"
  | "SITE_VISIT_COMPLETED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION_STARTED"
  | "DEAL_CREATED"
  | "DEAL_BOOKED"
  | "PAYMENT_PENDING";

export const followUpTriggerEvents: FollowUpTriggerEvent[] = [
  "LEAD_CREATED",
  "LEAD_QUALIFIED",
  "SITE_VISIT_REQUESTED",
  "SITE_VISIT_COMPLETED",
  "PROPOSAL_SENT",
  "NEGOTIATION_STARTED",
  "DEAL_CREATED",
  "DEAL_BOOKED",
  "PAYMENT_PENDING",
];

export interface FollowUpRule {
  id: string;
  triggerEvent: FollowUpTriggerEvent;
  delayMinutes: number;
  followUpType: "Call" | "WhatsApp" | "Meeting" | "Site Visit" | "Other";
  noteTemplate: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpRuleInput = Pick<FollowUpRule, "triggerEvent" | "delayMinutes" | "followUpType" | "noteTemplate" | "active" | "sortOrder">;
