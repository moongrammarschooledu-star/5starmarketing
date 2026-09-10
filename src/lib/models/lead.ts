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
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<
  Lead,
  "id" | "createdAt" | "updatedAt" | "status" | "consent" | "campaignId" | "campaignName"
> & {
  status?: LeadStatus;
  consent?: boolean;
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
