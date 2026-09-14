// ---------------------------------------------------------------------
// STEP 29 — Customer Support, Complaint & Service Desk models.
//
// A ticket's entire conversation (customer messages, staff replies,
// internal notes, attachments) lives on the EXISTING Communication
// Center (communication_conversations/communication_messages/
// communication_attachments, STEP 22) — see CommMessage/CommAttachment
// in @/lib/models/communication for those shapes. Nothing here
// duplicates them.
// ---------------------------------------------------------------------

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
export const supportTicketPriorities: SupportTicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"];

export type SupportTicketStatus =
  | "NEW"
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_FOR_INTERNAL_TEAM"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";
export const supportTicketStatuses: SupportTicketStatus[] = [
  "NEW",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "WAITING_FOR_INTERNAL_TEAM",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

export const SUPPORT_TICKET_ALLOWED_TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  NEW: ["OPEN", "ASSIGNED", "CANCELLED"],
  OPEN: ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_INTERNAL_TEAM", "ESCALATED", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_INTERNAL_TEAM", "ESCALATED", "RESOLVED", "CANCELLED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "ESCALATED", "RESOLVED", "CANCELLED"],
  WAITING_FOR_INTERNAL_TEAM: ["IN_PROGRESS", "ESCALATED", "RESOLVED", "CANCELLED"],
  ESCALATED: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_INTERNAL_TEAM", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "ASSIGNED", "IN_PROGRESS"],
  CANCELLED: [],
};

export type SupportTicketSource = "PORTAL" | "EMAIL" | "PHONE" | "WHATSAPP" | "ADMIN" | "OTHER";
export const supportTicketSources: SupportTicketSource[] = ["PORTAL", "EMAIL", "PHONE", "WHATSAPP", "ADMIN", "OTHER"];

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  conversationId: string;
  subject: string;
  description: string;
  categoryCode: string;
  categoryLabel?: string;
  departmentId?: string;
  departmentName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  customerId?: string;
  customerName?: string;
  createdBy?: string;
  createdByName?: string;
  source: SupportTicketSource;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  unitId?: string;
  dealId?: string;
  dealNumber?: string;
  leaseId?: string;
  leaseNumber?: string;
  paymentId?: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  slaRuleId?: string;
  slaResponseDueAt?: string;
  slaResolutionDueAt?: string;
  slaResponseBreached: boolean;
  slaResolutionBreached: boolean;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  reopenCount: number;
  satisfactionRating?: number;
  satisfactionCategory?: string;
  satisfactionComment?: string;
  wouldRecommend?: boolean;
  resolutionSatisfaction?: string;
  feedbackSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketInput = {
  subject: string;
  description: string;
  categoryCode: string;
  priority?: SupportTicketPriority;
  propertyId?: string;
  projectId?: string;
  unitId?: string;
  dealId?: string;
  leaseId?: string;
  paymentId?: string;
  source?: SupportTicketSource;
  // Set by staff creating a ticket on a customer's behalf; a customer's
  // own portal submission never passes these — the server resolves
  // customerId from the caller's own session.
  customerId?: string;
};

export interface SupportTicketFeedbackInput {
  satisfactionRating: number;
  satisfactionCategory?: string;
  satisfactionComment?: string;
  wouldRecommend?: boolean;
  resolutionSatisfaction?: string;
}

// ---------------------------------------------------------------------
// support_departments / support_department_staff (sections 8-9)
// ---------------------------------------------------------------------
export interface SupportDepartment {
  id: string;
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  active: boolean;
  staffCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type SupportDepartmentInput = {
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  active?: boolean;
};

export interface SupportDepartmentStaffMember {
  departmentId: string;
  adminId: string;
  adminName?: string;
}

// ---------------------------------------------------------------------
// support_categories (section 5)
// ---------------------------------------------------------------------
export interface SupportCategory {
  code: string;
  label: string;
  defaultDepartmentId?: string;
  defaultDepartmentName?: string;
  active: boolean;
  sortOrder: number;
}

export type SupportCategoryInput = {
  code: string;
  label: string;
  defaultDepartmentId?: string;
  active?: boolean;
  sortOrder?: number;
};

// ---------------------------------------------------------------------
// support_sla_rules (section 10) — resolved by specificity in
// slaService, never hard-coded.
// ---------------------------------------------------------------------
export interface SupportSlaRule {
  id: string;
  departmentId?: string;
  departmentName?: string;
  categoryCode?: string;
  categoryLabel?: string;
  priority: SupportTicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportSlaRuleInput = {
  departmentId?: string;
  categoryCode?: string;
  priority: SupportTicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly?: boolean;
};

export interface SupportSlaStatus {
  responseDueAt?: string;
  resolutionDueAt?: string;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseCompleted: boolean;
  resolutionCompleted: boolean;
  minutesToResponseDue: number | null;
  minutesToResolutionDue: number | null;
}

// ---------------------------------------------------------------------
// support_settings (singleton)
// ---------------------------------------------------------------------
export interface SupportSettings {
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  defaultDepartmentId?: string;
  disclaimerText: string;
  updatedAt: string;
}

export type SupportSettingsInput = Partial<Omit<SupportSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// support_escalations (section 14)
// ---------------------------------------------------------------------
export type SupportEscalationReason =
  | "SLA_BREACH"
  | "CUSTOMER_REQUESTED"
  | "HIGH_PRIORITY"
  | "REPEATED_COMPLAINT"
  | "MULTIPLE_REOPENINGS"
  | "DEPARTMENT_UNABLE_TO_RESOLVE"
  | "MANAGEMENT_REVIEW"
  | "OTHER";
export const supportEscalationReasons: SupportEscalationReason[] = [
  "SLA_BREACH",
  "CUSTOMER_REQUESTED",
  "HIGH_PRIORITY",
  "REPEATED_COMPLAINT",
  "MULTIPLE_REOPENINGS",
  "DEPARTMENT_UNABLE_TO_RESOLVE",
  "MANAGEMENT_REVIEW",
  "OTHER",
];

export interface SupportEscalation {
  id: string;
  ticketId: string;
  reason: SupportEscalationReason;
  previousDepartmentId?: string;
  previousDepartmentName?: string;
  newDepartmentId?: string;
  newDepartmentName?: string;
  previousAssigneeId?: string;
  previousAssigneeName?: string;
  newAssigneeId?: string;
  newAssigneeName?: string;
  resolutionAuthority?: string;
  notes?: string;
  escalatedBy?: string;
  escalatedByName?: string;
  createdAt: string;
}

export type SupportEscalationInput = {
  ticketId: string;
  reason: SupportEscalationReason;
  newDepartmentId?: string;
  newAssigneeId?: string;
  resolutionAuthority?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// support_complaints (section 13) — 1:1 companion to a ticket
// ---------------------------------------------------------------------
export type ComplaintSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export const complaintSeverities: ComplaintSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type ComplaintStatus = "SUBMITTED" | "ACKNOWLEDGED" | "UNDER_INVESTIGATION" | "ESCALATED" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED" | "REOPENED";
export const complaintStatuses: ComplaintStatus[] = ["SUBMITTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "ESCALATED", "ACTION_REQUIRED", "RESOLVED", "CLOSED", "REOPENED"];

export const COMPLAINT_ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["UNDER_INVESTIGATION", "ESCALATED"],
  UNDER_INVESTIGATION: ["ACTION_REQUIRED", "ESCALATED", "RESOLVED"],
  ESCALATED: ["UNDER_INVESTIGATION", "ACTION_REQUIRED", "RESOLVED"],
  ACTION_REQUIRED: ["UNDER_INVESTIGATION", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["UNDER_INVESTIGATION"],
};

export interface SupportComplaint {
  id: string;
  complaintNumber: string;
  ticketId: string;
  ticketNumber?: string;
  ticketSubject?: string;
  customerId?: string;
  customerName?: string;
  propertyId?: string;
  propertyTitle?: string;
  severity: ComplaintSeverity;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  status: ComplaintStatus;
  resolution?: string;
  customerResponse?: string;
  closureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportComplaintInput = {
  ticketId: string;
  severity?: ComplaintSeverity;
  assignedOfficerId?: string;
};

// ---------------------------------------------------------------------
// support_kb_articles / support_kb_feedback (section 17)
// ---------------------------------------------------------------------
export type KbVisibility = "PUBLIC" | "CUSTOMER_ONLY" | "INTERNAL";
export const kbVisibilities: KbVisibility[] = ["PUBLIC", "CUSTOMER_ONLY", "INTERNAL"];

export interface SupportKbArticle {
  id: string;
  title: string;
  categoryCode?: string;
  categoryLabel?: string;
  question: string;
  answer: string;
  keywords: string[];
  propertyId?: string;
  projectId?: string;
  published: boolean;
  visibility: KbVisibility;
  authorId?: string;
  authorName?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export type SupportKbArticleInput = {
  title: string;
  categoryCode?: string;
  question: string;
  answer: string;
  keywords?: string[];
  propertyId?: string;
  projectId?: string;
  published?: boolean;
  visibility?: KbVisibility;
};

// ---------------------------------------------------------------------
// support_audit_logs
// ---------------------------------------------------------------------
export interface SupportAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  reason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Dashboard / report shapes (sections 3, 21)
// ---------------------------------------------------------------------
export interface SupportDashboardStats {
  totalTickets: number;
  openTickets: number;
  newTicketsToday: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  reopenedTickets: number;
  escalatedTickets: number;
  complaints: number;
  highPriorityTickets: number;
  overdueSlaTickets: number;
  averageFirstResponseMinutes: number | null;
  averageResolutionMinutes: number | null;
  averageCsat: number | null;
}

export interface SupportCountBreakdown {
  label: string;
  count: number;
}

export interface SupportStaffPerformance {
  staffId: string;
  staffName: string;
  openTickets: number;
  resolvedTickets: number;
  averageResolutionMinutes: number | null;
  averageCsat: number | null;
}

export interface SupportDepartmentPerformance {
  departmentId: string;
  departmentName: string;
  openTickets: number;
  resolvedTickets: number;
  slaBreaches: number;
  averageCsat: number | null;
}
