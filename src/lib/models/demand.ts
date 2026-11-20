import type { PropertyType } from "./property";

// A client's demand: what a customer who came to the office (or called) is
// looking for. Private staff data - never shown on the public site.

/** "For Girvi" = the client wants a property on girvi (rehan / mortgage: a lump sum is paid to the owner and the property is lived in without monthly rent). */
export type DemandPurpose = "For Sale" | "For Rent" | "For Girvi";
export type DemandStatus = "Open" | "Matched" | "Closed" | "Lost";
export type DemandPriority = "Low" | "Normal" | "High" | "Urgent";

export const demandPurposes: DemandPurpose[] = ["For Sale", "For Rent", "For Girvi"];

/** What the client wants to do, in one word: Buy, Rent or Girvi. */
export function demandPurposeWord(purpose: DemandPurpose): "Buy" | "Rent" | "Girvi" {
  return purpose === "For Sale" ? "Buy" : purpose === "For Girvi" ? "Girvi" : "Rent";
}
export const demandStatuses: DemandStatus[] = ["Open", "Matched", "Closed", "Lost"];
export const demandPriorities: DemandPriority[] = ["Low", "Normal", "High", "Urgent"];

export interface PropertyDemand {
  id: string;
  /** Company reference number, e.g. "5Star.M-D-000001". Given by the database. */
  serialNo?: string;
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
  /** For rent demands: how many people will live there. `null` in an update clears a saved value. */
  familyMembers?: number | null;
  priority: DemandPriority;
  status: DemandStatus;
  notes?: string;
  /** Shown on the public website news bar - type, size, area and budget only. */
  showOnSite: boolean;
  assignedTo?: string;
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type DemandInput = Omit<PropertyDemand, "id" | "serialNo" | "assignedToName" | "createdBy" | "createdByName" | "createdAt" | "updatedAt">;

export type MatchLevel = "Strong" | "Good" | "Partial";
