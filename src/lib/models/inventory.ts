export type InventoryUnitType = "House" | "Apartment" | "Flat" | "Residential Plot" | "Commercial Plot" | "Shop" | "Office" | "Commercial Unit" | "Building" | "Other";

export type InventoryStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "SOLD" | "RENTED" | "UNDER_CONSTRUCTION" | "COMING_SOON" | "BLOCKED";

export type InventoryAreaUnit = "Sq Ft" | "Sq Yd" | "Marla" | "Kanal" | "Acre";

export const inventoryUnitTypes: InventoryUnitType[] = ["House", "Apartment", "Flat", "Residential Plot", "Commercial Plot", "Shop", "Office", "Commercial Unit", "Building", "Other"];
export const inventoryStatuses: InventoryStatus[] = ["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "RENTED", "UNDER_CONSTRUCTION", "COMING_SOON", "BLOCKED"];
export const inventoryAreaUnits: InventoryAreaUnit[] = ["Sq Ft", "Sq Yd", "Marla", "Kanal", "Acre"];

export const releaseReasons = ["Customer cancelled", "Payment not received", "Reservation expired", "Other"] as const;
export type ReleaseReason = (typeof releaseReasons)[number];

export interface InventoryUnit {
  id: string;
  propertyId?: string;
  projectId?: string;
  unitNumber: string;
  block?: string;
  building?: string;
  floor?: string;
  unitType: InventoryUnitType;
  status: InventoryStatus;
  price?: number;
  area?: number;
  areaUnit?: InventoryAreaUnit;
  bedrooms?: number;
  bathrooms?: number;
  orientation?: string;
  facing?: string;
  parking?: string;
  availabilityDate?: string;
  reservedAt?: string;
  reservedUntil?: string;
  bookedAt?: string;
  soldAt?: string;
  rentedAt?: string;
  leadId?: string;
  customerId?: string;
  agentId?: string;
  dealId?: string;
  blockReason?: string;
  archived: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Joined, display-only fields.
  propertyTitle?: string;
  projectName?: string;
  projectStatus?: string;
  agentName?: string;
  customerName?: string;
  dealNumber?: string;
}

export type InventoryInput = Omit<
  InventoryUnit,
  | "id"
  | "status"
  | "reservedAt"
  | "reservedUntil"
  | "bookedAt"
  | "soldAt"
  | "rentedAt"
  | "leadId"
  | "customerId"
  | "agentId"
  | "dealId"
  | "blockReason"
  | "archived"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
  | "propertyTitle"
  | "projectName"
  | "projectStatus"
  | "agentName"
  | "customerName"
  | "dealNumber"
> & { status?: InventoryStatus };

/** A slim, PUBLIC-SAFE row (section 16/17) — reads from
 *  property_inventory_public, never the base table. No customer/agent/
 *  deal/note/history fields exist on this type at all. */
export interface PublicInventoryAvailability {
  id: string;
  propertyId?: string;
  projectId?: string;
  unitNumber: string;
  block?: string;
  building?: string;
  floor?: string;
  unitType: InventoryUnitType;
  status: InventoryStatus;
  price?: number;
  area?: number;
  areaUnit?: InventoryAreaUnit;
  bedrooms?: number;
  bathrooms?: number;
  availabilityDate?: string;
}

export interface InventoryStatusHistoryEntry {
  id: string;
  inventoryId: string;
  previousStatus?: InventoryStatus;
  newStatus: InventoryStatus;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
}

export interface InventoryPriceHistoryEntry {
  id: string;
  inventoryId: string;
  previousPrice?: number;
  newPrice: number;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
}

export interface InventoryNote {
  id: string;
  inventoryId: string;
  note: string;
  createdBy?: string;
  userId?: string;
  createdAt: string;
}

export interface InventoryDashboardStats {
  total: number;
  available: number;
  reserved: number;
  booked: number;
  sold: number;
  rented: number;
  underConstruction: number;
  comingSoon: number;
  blocked: number;
  totalValue: number;
  availableValue: number;
  soldValue: number;
}

export interface ProjectInventorySummary {
  projectId: string;
  projectName: string;
  projectStatus: string;
  total: number;
  available: number;
  reserved: number;
  booked: number;
  sold: number;
  rented: number;
}

// ---------------------------------------------------------------------
// Search (sections 27-30)
// ---------------------------------------------------------------------
export const DEFAULT_INVENTORY_PAGE_SIZE = 24;
export const MAX_INVENTORY_PAGE_SIZE = 100;

export type InventorySortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "size_asc" | "size_desc" | "unit_number";

export interface InventorySearchFilters {
  q?: string;
  projectId?: string;
  propertyId?: string;
  unitType?: InventoryUnitType;
  block?: string;
  building?: string;
  floor?: string;
  status?: InventoryStatus;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  agentId?: string;
  availabilityDateFrom?: string;
  availabilityDateTo?: string;
  includeArchived?: boolean;
  sort?: InventorySortKey;
  page?: number;
  pageSize?: number;
}

export interface InventorySearchResult {
  units: InventoryUnit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Bulk import (section 25)
// ---------------------------------------------------------------------
export interface InventoryImportRow {
  rowNumber: number;
  project?: string;
  block?: string;
  building?: string;
  floor?: string;
  unitNumber: string;
  unitType: string;
  area?: string;
  areaUnit?: string;
  price?: string;
  status?: string;
}

export interface InventoryImportValidationResult {
  valid: (InventoryImportRow & { projectId?: string })[];
  invalid: { row: InventoryImportRow; errors: string[] }[];
  duplicates: { row: InventoryImportRow; reason: string }[];
}
