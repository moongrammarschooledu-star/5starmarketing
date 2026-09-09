export type LeadStatus = "New" | "Contacted" | "Interested" | "Follow-Up" | "Closed" | "Lost";

export type LeadSource =
  | "Website"
  | "Property Page"
  | "WhatsApp"
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "Direct"
  | "Other";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  propertyId?: string;
  propertyTitle?: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  consent: boolean;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<
  Lead,
  "id" | "createdAt" | "updatedAt" | "status" | "consent"
> & {
  status?: LeadStatus;
  consent?: boolean;
};

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdBy?: string;
  createdAt: string;
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
}

export const leadStatuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Follow-Up",
  "Closed",
  "Lost",
];

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
];

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  followUp: number;
  closed: number;
  lost: number;
}
