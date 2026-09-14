export type FollowUpType = "Call" | "WhatsApp" | "Meeting" | "Site Visit" | "Other";
export type FollowUpStatus = "Pending" | "Completed" | "Cancelled" | "Overdue";

export const followUpTypes: FollowUpType[] = ["Call", "WhatsApp", "Meeting", "Site Visit", "Other"];
export const followUpStatuses: FollowUpStatus[] = ["Pending", "Completed", "Cancelled", "Overdue"];

export interface FollowUp {
  id: string;
  leadId: string;
  assignedAgentId?: string;
  followUpDate: string; // YYYY-MM-DD
  followUpTime?: string; // HH:MM
  type: FollowUpType;
  note: string;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
  // Marketing Automation (STEP 21) — "automation" follow-ups share an
  // automationGroupKey (lead + trigger event) so completing/cancelling
  // any one of them auto-cancels the rest of the same cascade.
  source: "manual" | "automation";
  automationGroupKey?: string;
  // Joined-in, read-only context for list views — not persisted here.
  leadName?: string;
  leadPhone?: string;
  propertyTitle?: string;
  agentName?: string;
}

export type FollowUpInput = Pick<FollowUp, "leadId" | "assignedAgentId" | "followUpDate" | "followUpTime" | "type" | "note"> & {
  source?: "manual" | "automation";
  automationGroupKey?: string;
};

/** Staff-facing notifications — distinct from the customer-facing
 *  CustomerNotification model; these point at admin_profiles.id. */
export type StaffNotificationType =
  | "lead_assigned"
  | "lead_reassigned"
  | "follow_up_due"
  | "follow_up_overdue"
  | "appointment_assigned"
  | "status_changed"
  // STEP 19 — Inventory
  | "inventory_reserved"
  | "inventory_reservation_expiring"
  | "inventory_released"
  | "inventory_booked"
  | "inventory_sold"
  // STEP 21 — Marketing Automation
  | "sla_breached"
  | "automation_alert"
  // STEP 23 — Accounting
  | "expense_submitted"
  | "expense_approved"
  | "expense_rejected"
  | "commission_approved"
  | "commission_paid"
  // STEP 25 — Property Inspection + Maintenance + Facility Management
  | "maintenance_request_new"
  | "maintenance_request_assigned"
  | "work_order_assigned"
  | "warranty_expiring"
  | "preventive_maintenance_due"
  // STEP 28 — Legal, Compliance & Due-Diligence
  | "legal_officer_assigned"
  | "legal_document_verification_requested"
  | "legal_document_expiring"
  | "legal_document_expired"
  | "due_diligence_deadline_approaching"
  | "legal_case_hearing_reminder"
  | "legal_notice_response_due"
  | "legal_approval_requested"
  | "legal_risk_flagged"
  | "legal_contract_expiring"
  | "compliance_review_due"
  // STEP 29 — Customer Support, Complaint & Service Desk
  | "support_ticket_created"
  | "support_ticket_assigned"
  | "support_ticket_customer_reply"
  | "support_ticket_sla_warning"
  | "support_ticket_sla_breached"
  | "support_ticket_escalated"
  | "support_complaint_filed"
  | "support_complaint_escalated";

export interface StaffNotification {
  id: string;
  userId: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

export type LeadAssignmentMethod = "Manual" | "Round Robin" | "Least Assigned Leads";

export const leadAssignmentMethods: LeadAssignmentMethod[] = ["Manual", "Round Robin", "Least Assigned Leads"];

/** Real, from-data-only performance metrics for one agent — every count
 *  comes straight from leads/follow_ups; nothing here is estimated. */
export interface AgentPerformance {
  agentId: string;
  agentName: string;
  assigned: number;
  contacted: number;
  interested: number;
  siteVisits: number;
  closed: number;
  lost: number;
  conversionRate: number | null; // null = "No performance data available yet."
  avgFollowUpCompletionHours: number | null;
}
