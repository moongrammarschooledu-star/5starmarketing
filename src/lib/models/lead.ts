export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Follow-Up"
  | "Site Visit"
  | "Negotiation"
  | "Closed"
  | "Lost";

export type LeadSource =
  | "Website"
  | "Property Page"
  | "WhatsApp"
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "Direct"
  | "Other"
  | "Site Visit";

// STEP 17 — CRM fields.

export type LeadPriority = "Low" | "Medium" | "High" | "Urgent";

/** What the customer actually wants, distinct from `source` (where they
 *  came from) — consolidates STEP 17's longer capture-point list
 *  (Contact Agent / Call Request / WhatsApp Inquiry / General Property
 *  Inquiry are all just channel variations of the same intent). */
export type LeadType =
  | "General Inquiry"
  | "Property Details"
  | "Callback Request"
  | "Site Visit"
  | "Brochure Request"
  | "Investment Inquiry"
  | "Project Inquiry"
  | "Price Request"
  | "Payment Plan Request";

export type LeadPurpose = "Buy" | "Rent" | "Invest";

export type LostReason =
  | "Budget"
  | "Not Interested"
  | "Property Unavailable"
  | "Bought Elsewhere"
  | "Rent Elsewhere"
  | "No Response"
  | "Invalid Lead"
  | "Other";

import type { ScoreLevel } from "./leadScoring";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  propertyId?: string;
  propertyTitle?: string;
  customerId?: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  consent: boolean;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  assignedTo?: string;
  assignedAgentId?: string;
  // Marketing attribution (STEP 15) — captured once at creation from the
  // visitor's client-side first/last-touch record; immutable afterward
  // (locked at the database level, not just here).
  campaignId?: string;
  campaignName?: string;
  firstTouchSource?: string;
  firstTouchMedium?: string;
  firstTouchCampaign?: string;
  firstTouchContent?: string;
  firstTouchTerm?: string;
  firstTouchLandingPage?: string;
  lastTouchSource?: string;
  lastTouchMedium?: string;
  lastTouchCampaign?: string;
  lastTouchContent?: string;
  lastTouchTerm?: string;
  lastTouchLandingPage?: string;
  // STEP 17 — CRM fields.
  priority: LeadPriority;
  leadType: LeadType;
  projectId?: string;
  projectTitle?: string;
  projectName?: string;
  purpose?: LeadPurpose;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  preferredPropertyType?: string;
  preferredBedrooms?: number;
  lastContactedAt?: string;
  lostReason?: LostReason;
  convertedAt?: string;
  convertedBy?: string;
  convertedByName?: string;
  archived: boolean;
  archivedAt?: string;
  // Lead Scoring (STEP 21) — score/scoreLevel are system-computed (see
  // leadScoringService), never set directly by a form. autoPriority is
  // the system's own suggestion, kept separate from the manual `priority`
  // above so one never silently overwrites the other.
  score: number;
  scoreLevel: ScoreLevel;
  autoPriority?: LeadPriority;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<
  Lead,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "consent"
  | "campaignId"
  | "campaignName"
  | "priority"
  | "leadType"
  | "projectName"
  | "convertedAt"
  | "convertedBy"
  | "convertedByName"
  | "archived"
  | "archivedAt"
  | "score"
  | "scoreLevel"
  | "autoPriority"
  | "tags"
> & {
  status?: LeadStatus;
  consent?: boolean;
  priority?: LeadPriority;
  leadType?: LeadType;
};

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdBy?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Extra, joined-in details about the property a lead is interested in —
 *  fetched separately since `leads` only stores property_id + a denormalized
 *  title fallback (for when the property is later deleted). */
export interface LeadPropertyInfo {
  title: string;
  slug: string;
  type: string;
  location: string;
  price: string;
  size: string;
}

export const leadStatuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Follow-Up",
  "Site Visit",
  "Negotiation",
  "Closed",
  "Lost",
];

/** Statuses a sales_agent may set from the agent portal — mirrors the
 *  DB trigger's intent (agents change progress, not identity/ownership
 *  fields), kept here purely for UI convenience. */
export const agentAllowedStatuses: LeadStatus[] = leadStatuses;

export const leadSources: LeadSource[] = [
  "Website",
  "Property Page",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "Direct",
  "Other",
  "Site Visit",
];

export const leadPriorities: LeadPriority[] = ["Low", "Medium", "High", "Urgent"];

export const leadTypes: LeadType[] = [
  "General Inquiry",
  "Property Details",
  "Callback Request",
  "Site Visit",
  "Brochure Request",
  "Investment Inquiry",
  "Project Inquiry",
  "Price Request",
  "Payment Plan Request",
];

export const leadPurposes: LeadPurpose[] = ["Buy", "Rent", "Invest"];

export const lostReasons: LostReason[] = [
  "Budget",
  "Not Interested",
  "Property Unavailable",
  "Bought Elsewhere",
  "Rent Elsewhere",
  "No Response",
  "Invalid Lead",
  "Other",
];

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  followUp: number;
  siteVisit: number;
  negotiation: number;
  closed: number;
  lost: number;
}

/** CRM Dashboard (STEP 17, section 1) — every field is a real, live
 *  count. "Qualified" reuses the existing "Interested" pipeline stage
 *  (display label only, the underlying status value is unchanged) and
 *  "Converted" reuses "Closed" — both are display-mapping decisions to
 *  avoid renaming the 8-stage enum everywhere it's already used. */
export interface CrmDashboardStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  siteVisit: number;
  negotiation: number;
  converted: number;
  lost: number;
  followUpDue: number;
  unassigned: number;
}
