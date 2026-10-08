import type { PropertyType } from "./property";

// A client's demand: what a customer who came to the office (or called) is
// looking for. Private staff data - never shown on the public site.

export type DemandPurpose = "For Sale" | "For Rent";
export type DemandStatus = "Open" | "Matched" | "Closed" | "Lost";
export type DemandPriority = "Low" | "Normal" | "High" | "Urgent";

export const demandPurposes: DemandPurpose[] = ["For Sale", "For Rent"];
export const demandStatuses: DemandStatus[] = ["Open", "Matched", "Closed", "Lost"];
export const demandPriorities: DemandPriority[] = ["Low", "Normal", "High", "Urgent"];

export interface PropertyDemand {
  id: string;
  clientName: string;
  clientPhone: string;
  clientWhatsapp?: string;
  purpose: DemandPurpose;
  /** Empty = any type. */
  propertyTypes: PropertyType[];
  /** Areas the client would accept, free text ("Johar Town", "DHA Lahore"). Empty = anywhere. */
  locations: string[];
  /** Rupees. */
  budgetMin?: number;
  budgetMax?: number;
  /** In Marla (1 Kanal = 20 Marla, 1 Marla = 225 sq ft). */
  sizeMinMarla?: number;
  sizeMaxMarla?: number;
  minBedrooms?: number;
  priority: DemandPriority;
  status: DemandStatus;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type DemandInput = Omit<PropertyDemand, "id" | "assignedToName" | "createdBy" | "createdByName" | "createdAt" | "updatedAt">;

export type MatchLevel = "Strong" | "Good" | "Partial";
