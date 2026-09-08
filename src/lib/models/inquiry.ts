export type LeadStatus = "New" | "Contacted" | "Follow-up" | "Closed";
export type LeadSource = "Website" | "WhatsApp" | "Contact Form";

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  propertyId?: string;
  propertyTitle?: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export type InquiryInput = Omit<Inquiry, "id" | "createdAt" | "updatedAt" | "status"> & {
  status?: LeadStatus;
};

export const leadStatuses: LeadStatus[] = ["New", "Contacted", "Follow-up", "Closed"];
export const leadSources: LeadSource[] = ["Website", "WhatsApp", "Contact Form"];
