import type { Lead, LeadStatus, LeadPriority, LeadSource, LeadType, LeadPurpose } from "./lead";

export const DEFAULT_LEAD_PAGE_SIZE = 20;
export const MAX_LEAD_PAGE_SIZE = 100;

export type FollowUpDueFilter = "overdue" | "today" | "upcoming" | "none";

/** The one filter shape every layer (URL parsing, leadService.search,
 *  CSV export, the CRM analytics date-range picker) agrees on. */
export interface LeadSearchFilters {
  q?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  leadType?: LeadType;
  purpose?: LeadPurpose;
  agentId?: string;
  unassigned?: boolean;
  campaignId?: string;
  propertyId?: string;
  projectId?: string;
  propertyType?: string;
  followUpDue?: FollowUpDueFilter;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadSearchResult {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** CRM display-label mapping — "Qualified" for the existing "Interested"
 *  pipeline stage and "Converted" for "Closed". The underlying LeadStatus
 *  enum is deliberately left unchanged (it's used across STEPs 5-16), so
 *  this only ever affects what the CRM screens print, never what's
 *  stored or filtered on. */
export function crmStatusLabel(status: LeadStatus): string {
  if (status === "Interested") return "Qualified";
  if (status === "Closed") return "Converted";
  return status;
}

// ---------------------------------------------------------------------
// Communication log (section 24) — a MANUAL record an agent/admin adds
// after actually contacting a customer. Never auto-generated: there is
// no telephony or WhatsApp Business API integration wired up in this
// deployment, so nothing here claims a call/message happened unless a
// real person logged it.
// ---------------------------------------------------------------------
export type CommunicationType = "Phone" | "WhatsApp" | "Email" | "SMS" | "Meeting" | "Other";
export type CommunicationDirection = "Outgoing" | "Incoming";

export const communicationTypes: CommunicationType[] = ["Phone", "WhatsApp", "Email", "SMS", "Meeting", "Other"];
export const communicationDirections: CommunicationDirection[] = ["Outgoing", "Incoming"];

export interface CommunicationLogEntry {
  id: string;
  leadId: string;
  agentId?: string;
  agentName?: string;
  communicationType: CommunicationType;
  direction: CommunicationDirection;
  summary: string;
  createdAt: string;
}

export type CommunicationLogInput = Pick<CommunicationLogEntry, "leadId" | "communicationType" | "direction" | "summary">;

// ---------------------------------------------------------------------
// Lead assignment history (section 20) — accountability trail for every
// assign/reassign, whether manual or automatic.
// ---------------------------------------------------------------------
export interface LeadAssignmentHistoryEntry {
  id: string;
  leadId: string;
  previousAgentId?: string;
  previousAgentName?: string;
  newAgentId?: string;
  newAgentName?: string;
  changedBy?: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// CRM Analytics (section 46-51) — every field is real, from-data-only;
// see crmAnalyticsService for the "not enough data" thresholds.
// ---------------------------------------------------------------------
export interface AgentCrmPerformance {
  agentId: string;
  agentName: string;
  assigned: number;
  contacted: number;
  qualified: number;
  siteVisits: number;
  converted: number;
  lost: number;
  conversionRate: number | null;
  followUpsCompleted: number;
}

export interface PropertyLeadPerformance {
  propertyId: string;
  propertyTitle: string;
  leads: number;
  siteVisits: number;
  converted: number;
}

export interface ProjectLeadPerformance {
  projectId: string;
  projectName: string;
  leads: number;
  siteVisits: number;
  converted: number;
}

export interface CampaignLeadPerformance {
  campaignId: string;
  campaignName: string;
  leads: number;
  converted: number;
}

export interface CrmAnalyticsSummary {
  hasEnoughData: boolean;
  totalLeads: number;
  qualifiedLeads: number;
  siteVisits: number;
  negotiations: number;
  converted: number;
  lost: number;
  conversionRate: number | null;
  bySource: { label: string; count: number }[];
  averageResponseTimeHours: number | null;
  averageConversionTimeDays: number | null;
}
