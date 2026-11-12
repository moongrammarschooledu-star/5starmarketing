import type { PropertyType } from "./property";

// A general contact: anyone who walked in, phoned or messaged, with a note of
// what they want. Private staff data - never shown on the public site.

export const contactSources = ["Walk-in", "Phone call", "Website", "WhatsApp", "Facebook", "Reference", "Other"] as const;
export type ContactSource = (typeof contactSources)[number];

export type ContactPurpose = "For Sale" | "For Rent";

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  /** Free text, e.g. "5 marla house near Johar Town". */
  propertyDetail?: string;
  remarks?: string;
  source: ContactSource;
  // Optional - only used to suggest matching properties.
  purpose?: ContactPurpose;
  propertyType?: PropertyType;
  area?: string;
  /** Rupees. */
  budgetMax?: number;
  /** In Marla. */
  sizeMarla?: number;
  createdAt: string;
  updatedAt: string;
}

export type ContactInput = Omit<CustomerContact, "id" | "createdAt" | "updatedAt">;
