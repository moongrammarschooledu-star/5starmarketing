// ---------------------------------------------------------------------
// Property Inspection + Maintenance + Facility Management (new module).
//
// Terminology discipline: every cost figure is real, never invented;
// customer-facing types never carry internal_cost/vendor pricing/agent
// notes (see CustomerWorkOrderView below) — the same discipline STEP 24
// used for investment analyses.
// ---------------------------------------------------------------------

export type ConditionRating = "GOOD" | "FAIR" | "POOR" | "DAMAGED" | "NOT_INSPECTED" | "NOT_APPLICABLE";
export const conditionRatings: ConditionRating[] = ["GOOD", "FAIR", "POOR", "DAMAGED", "NOT_INSPECTED", "NOT_APPLICABLE"];

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export const severities: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type ChecklistCategory =
  | "Exterior"
  | "Structure"
  | "Roof"
  | "Walls"
  | "Doors"
  | "Windows"
  | "Flooring"
  | "Ceiling"
  | "Electrical"
  | "Plumbing"
  | "Kitchen"
  | "Bathrooms"
  | "HVAC"
  | "Water Supply"
  | "Drainage"
  | "Security"
  | "Parking"
  | "Garden"
  | "Common Areas"
  | "Other";
export const checklistCategories: ChecklistCategory[] = ["Exterior", "Structure", "Roof", "Walls", "Doors", "Windows", "Flooring", "Ceiling", "Electrical", "Plumbing", "Kitchen", "Bathrooms", "HVAC", "Water Supply", "Drainage", "Security", "Parking", "Garden", "Common Areas", "Other"];

// ---------------------------------------------------------------------
// Vendors / Contractors (section 13)
// ---------------------------------------------------------------------
export type VendorStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export const vendorStatuses: VendorStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export interface MaintenanceVendor {
  id: string;
  businessName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  serviceCategories: string[];
  coverageAreas: string[];
  status: VendorStatus;
  notes?: string;
  rating?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceVendorInput = Pick<MaintenanceVendor, "businessName" | "contactPerson" | "phone" | "email" | "address" | "serviceCategories" | "coverageAreas" | "notes"> & { status?: VendorStatus };

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  assignedJobs: number;
  completedJobs: number;
  averageCompletionDays: number | null;
  averageCost: number | null;
  reopenedJobs: number;
  onTimeCompletionPercent: number | null;
  hasSufficientData: boolean;
}

// ---------------------------------------------------------------------
// Assets / equipment (sections 19-21)
// ---------------------------------------------------------------------
export type AssetStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "OUT_OF_SERVICE" | "RETIRED";
export const assetStatuses: AssetStatus[] = ["ACTIVE", "UNDER_MAINTENANCE", "OUT_OF_SERVICE", "RETIRED"];

export interface MaintenanceAsset {
  id: string;
  assetNumber: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  location?: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  installationDate?: string;
  condition: ConditionRating;
  status: AssetStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceAssetInput = {
  propertyId?: string;
  projectId?: string;
  location?: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  installationDate?: string;
  condition?: ConditionRating;
  status?: AssetStatus;
  notes?: string;
};

export interface AssetWarranty {
  id: string;
  assetId: string;
  provider?: string;
  startDate?: string;
  expiryDate: string;
  coverageDescription?: string;
  documentId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  active: boolean;
  createdAt: string;
}

export type AssetWarrantyInput = Pick<AssetWarranty, "provider" | "startDate" | "expiryDate" | "coverageDescription" | "contactName" | "contactPhone" | "contactEmail">;

export type ServiceHistoryEventType = "INSTALLATION" | "INSPECTION" | "MAINTENANCE" | "REPAIR" | "WARRANTY_EVENT" | "OTHER";

export interface AssetServiceHistoryEntry {
  id: string;
  assetId: string;
  eventType: ServiceHistoryEventType;
  eventDate: string;
  description?: string;
  cost?: number;
  vendorId?: string;
  vendorName?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Inspection templates (section 5)
// ---------------------------------------------------------------------
export interface InspectionTemplate {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InspectionTemplateInput = Pick<InspectionTemplate, "name" | "description"> & { active?: boolean };

export interface InspectionChecklistItemDef {
  id: string;
  templateId: string;
  category: ChecklistCategory;
  item: string;
  required: boolean;
  sortOrder: number;
}

export type InspectionChecklistItemDefInput = Pick<InspectionChecklistItemDef, "category" | "item" | "required" | "sortOrder">;

// ---------------------------------------------------------------------
// Property inspections (sections 3-4, 38)
// ---------------------------------------------------------------------
export type InspectionType = "PRE_PURCHASE" | "PRE_SALE" | "PRE_RENTAL" | "MOVE_IN" | "MOVE_OUT" | "ROUTINE" | "MAINTENANCE" | "CONSTRUCTION" | "HANDOVER" | "FINAL";
export const inspectionTypes: InspectionType[] = ["PRE_PURCHASE", "PRE_SALE", "PRE_RENTAL", "MOVE_IN", "MOVE_OUT", "ROUTINE", "MAINTENANCE", "CONSTRUCTION", "HANDOVER", "FINAL"];

export type InspectionStatus = "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "REVIEW_REQUIRED" | "APPROVED" | "CANCELLED";
export const inspectionStatuses: InspectionStatus[] = ["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "REVIEW_REQUIRED", "APPROVED", "CANCELLED"];

/** Server-enforced (never trust the frontend) — mirrors documentService/
 *  expenseService's ALLOWED_TRANSITIONS pattern exactly. */
export const INSPECTION_ALLOWED_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  SCHEDULED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REVIEW_REQUIRED", "APPROVED"],
  REVIEW_REQUIRED: ["APPROVED", "IN_PROGRESS"],
  APPROVED: [],
  CANCELLED: [],
};

export interface PropertyInspection {
  id: string;
  inspectionNumber: string;
  propertyId: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  dealId?: string;
  dealNumber?: string;
  templateId?: string;
  customerId?: string;
  customerName?: string;
  agentId?: string;
  agentName?: string;
  inspectorId?: string;
  inspectorName?: string;
  inspectionType: InspectionType;
  scheduledDate?: string;
  completedDate?: string;
  status: InspectionStatus;
  overallCondition?: ConditionRating;
  notes?: string;
  recommendations?: string;
  documentId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyInspectionInput = {
  propertyId: string;
  projectId?: string;
  dealId?: string;
  templateId?: string;
  customerId?: string;
  agentId?: string;
  inspectorId?: string;
  inspectionType: InspectionType;
  scheduledDate?: string;
  notes?: string;
};

export interface InspectionResult {
  id: string;
  inspectionId: string;
  checklistItemId?: string;
  category: string;
  item: string;
  condition: ConditionRating;
  severity?: Severity;
  notes?: string;
  required: boolean;
  updatedAt: string;
}

export type InspectionResultInput = { condition: ConditionRating; severity?: Severity; notes?: string };

export interface InspectionPhoto {
  id: string;
  inspectionId: string;
  propertyId: string;
  checklistResultId?: string;
  defectId?: string;
  storagePath: string;
  caption?: string;
  uploadedByName?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Defects (section 6)
// ---------------------------------------------------------------------
export type DefectStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED" | "CANCELLED";
export const defectStatuses: DefectStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"];

export const DEFECT_ALLOWED_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["VERIFIED", "IN_PROGRESS"],
  VERIFIED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export interface PropertyDefect {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  inspectionId?: string;
  checklistResultId?: string;
  category: string;
  description: string;
  severity: Severity;
  location?: string;
  recommendedAction?: string;
  estimatedCost?: number;
  actualCost?: number;
  status: DefectStatus;
  assignedVendorId?: string;
  assignedVendorName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  dueDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyDefectInput = {
  propertyId: string;
  inspectionId?: string;
  checklistResultId?: string;
  category: string;
  description: string;
  severity: Severity;
  location?: string;
  recommendedAction?: string;
  estimatedCost?: number;
  assignedVendorId?: string;
  assignedTechnicianId?: string;
  dueDate?: string;
};

// ---------------------------------------------------------------------
// Maintenance requests (sections 9-10, 14, 25-26)
// ---------------------------------------------------------------------
export type MaintenanceCategory = "Plumbing" | "Electrical" | "HVAC" | "Civil Work" | "Carpentry" | "Painting" | "Cleaning" | "Appliance" | "Security" | "Water" | "Drainage" | "Internet/Communication" | "Other";
export const maintenanceCategories: MaintenanceCategory[] = ["Plumbing", "Electrical", "HVAC", "Civil Work", "Carpentry", "Painting", "Cleaning", "Appliance", "Security", "Water", "Drainage", "Internet/Communication", "Other"];

export type MaintenancePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "EMERGENCY";
export const maintenancePriorities: MaintenancePriority[] = ["LOW", "NORMAL", "HIGH", "URGENT", "EMERGENCY"];

export type MaintenanceRequestStatus = "NEW" | "ACKNOWLEDGED" | "ASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "WAITING_FOR_PARTS" | "WAITING_FOR_CUSTOMER" | "COMPLETED" | "VERIFICATION_REQUIRED" | "CLOSED" | "REJECTED" | "CANCELLED";
export const maintenanceRequestStatuses: MaintenanceRequestStatus[] = ["NEW", "ACKNOWLEDGED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING_FOR_PARTS", "WAITING_FOR_CUSTOMER", "COMPLETED", "VERIFICATION_REQUIRED", "CLOSED", "REJECTED", "CANCELLED"];

export const MAINTENANCE_REQUEST_ALLOWED_TRANSITIONS: Record<MaintenanceRequestStatus, MaintenanceRequestStatus[]> = {
  NEW: ["ACKNOWLEDGED", "REJECTED", "CANCELLED"],
  ACKNOWLEDGED: ["ASSIGNED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["VERIFICATION_REQUIRED", "CLOSED"],
  VERIFICATION_REQUIRED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: ["VERIFICATION_REQUIRED"],
  REJECTED: [],
  CANCELLED: [],
};

export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  propertyId: string;
  propertyTitle?: string;
  unitId?: string;
  unitNumber?: string;
  customerId?: string;
  customerName?: string;
  createdBy?: string;
  createdByName?: string;
  category: MaintenanceCategory;
  description: string;
  priority: MaintenancePriority;
  preferredVisitTime?: string;
  status: MaintenanceRequestStatus;
  slaResponseDueAt?: string;
  slaResolutionDueAt?: string;
  firstResponseAt?: string;
  slaResponseBreached: boolean;
  slaResolutionBreached: boolean;
  closedAt?: string;
  customerConfirmed: boolean;
  customerConfirmedAt?: string;
  customerFeedback?: string;
  customerRating?: number;
  reportedUnresolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceRequestInput = {
  propertyId: string;
  unitId?: string;
  category: MaintenanceCategory;
  description: string;
  priority?: MaintenancePriority;
  preferredVisitTime?: string;
};

// ---------------------------------------------------------------------
// Work orders (sections 11-12)
// ---------------------------------------------------------------------
export type WorkOrderStatus = "NEW" | "ASSIGNED" | "SCHEDULED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "VERIFICATION" | "CLOSED" | "CANCELLED";
export const workOrderStatuses: WorkOrderStatus[] = ["NEW", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "VERIFICATION", "CLOSED", "CANCELLED"];

export const WORK_ORDER_ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["VERIFICATION", "CLOSED"],
  VERIFICATION: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
};

export type WorkOrderItemType = "PART" | "LABOR" | "OTHER";
export const workOrderItemTypes: WorkOrderItemType[] = ["PART", "LABOR", "OTHER"];

export interface MaintenanceWorkOrderItem {
  id: string;
  workOrderId: string;
  itemType: WorkOrderItemType;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
}

export type MaintenanceWorkOrderItemInput = Pick<MaintenanceWorkOrderItem, "itemType" | "description" | "quantity" | "unitCost">;

export interface MaintenanceWorkOrder {
  id: string;
  workOrderNumber: string;
  maintenanceRequestId?: string;
  requestNumber?: string;
  propertyId: string;
  propertyTitle?: string;
  unitId?: string;
  assetId?: string;
  assetNumber?: string;
  vendorId?: string;
  vendorName?: string;
  technicianId?: string;
  technicianName?: string;
  priority: MaintenancePriority;
  description: string;
  scopeOfWork?: string;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  estimatedCost?: number;
  approvedCost?: number;
  actualCost?: number;
  customerCharge?: number;
  internalCost?: number;
  notes?: string;
  status: WorkOrderStatus;
  expenseId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceWorkOrderInput = {
  maintenanceRequestId?: string;
  propertyId: string;
  unitId?: string;
  assetId?: string;
  vendorId?: string;
  technicianId?: string;
  priority?: MaintenancePriority;
  description: string;
  scopeOfWork?: string;
  scheduledDate?: string;
  estimatedCost?: number;
};

/** Customer-safe view of a work order (section 22) — never internal
 *  cost, vendor internal pricing, or private notes. */
export interface CustomerWorkOrderView {
  id: string;
  workOrderNumber: string;
  status: WorkOrderStatus;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  technicianName?: string;
  vendorName?: string;
  customerCharge?: number;
}

// ---------------------------------------------------------------------
// Photos (sections 7-8)
// ---------------------------------------------------------------------
export type PhotoType = "BEFORE" | "DURING" | "AFTER" | "GENERAL";
export const photoTypes: PhotoType[] = ["BEFORE", "DURING", "AFTER", "GENERAL"];
export type MaintenancePhotoEntityType = "REQUEST" | "WORK_ORDER";

export interface MaintenancePhoto {
  id: string;
  entityType: MaintenancePhotoEntityType;
  entityId: string;
  photoType: PhotoType;
  storagePath: string;
  caption?: string;
  uploadedByName?: string;
  uploadedByCustomer: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Status history / comments (section 40, 43)
// ---------------------------------------------------------------------
export type MaintenanceEntityType = "REQUEST" | "WORK_ORDER" | "INSPECTION" | "DEFECT";

export interface MaintenanceStatusHistoryEntry {
  id: string;
  entityType: "REQUEST" | "WORK_ORDER";
  entityId: string;
  fromStatus?: string;
  toStatus: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

export interface MaintenanceComment {
  id: string;
  entityType: MaintenanceEntityType;
  entityId: string;
  authorName: string;
  body: string;
  internalOnly: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Preventive maintenance schedules (sections 17-18)
// ---------------------------------------------------------------------
export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "CUSTOM";
export const scheduleFrequencies: ScheduleFrequency[] = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "CUSTOM"];

export interface MaintenanceSchedule {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  assetId?: string;
  assetNumber?: string;
  maintenanceType: string;
  frequency: ScheduleFrequency;
  customIntervalDays?: number;
  lastCompletedDate?: string;
  nextDueDate: string;
  assignedVendorId?: string;
  assignedVendorName?: string;
  estimatedCost?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceScheduleInput = {
  propertyId: string;
  assetId?: string;
  maintenanceType: string;
  frequency: ScheduleFrequency;
  customIntervalDays?: number;
  nextDueDate: string;
  assignedVendorId?: string;
  estimatedCost?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// SLA settings (section 26) — configurable, never a hardcoded promise.
// ---------------------------------------------------------------------
export interface MaintenanceSlaSetting {
  priority: MaintenancePriority;
  responseMinutes: number;
  resolutionMinutes: number;
  active: boolean;
  updatedAt: string;
}

export type MaintenanceSlaSettingInput = Pick<MaintenanceSlaSetting, "responseMinutes" | "resolutionMinutes" | "active">;

// ---------------------------------------------------------------------
// Module settings (singleton, sections 34-35)
// ---------------------------------------------------------------------
export interface MaintenanceSettings {
  recurringIssueThresholdCount: number;
  recurringIssueWindowDays: number;
  warrantyAlertDaysBefore: number;
  preventiveMaintenanceAlertDaysBefore: number;
  conditionScoreExcellentMin: number;
  conditionScoreGoodMin: number;
  conditionScoreFairMin: number;
  conditionScoreNeedsAttentionMin: number;
  currency: string;
  disclaimerText: string;
  updatedAt: string;
}

export type MaintenanceSettingsInput = Partial<Omit<MaintenanceSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// Audit log (section 43) — mirrors financial_audit_logs/investment_audit_logs.
// ---------------------------------------------------------------------
export interface MaintenanceAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Condition score (section 35) — transparent, factor-disclosing, never
// hides a serious issue behind a single number.
// ---------------------------------------------------------------------
export type ConditionScoreLabel = "Excellent" | "Good" | "Fair" | "Needs Attention" | "Critical";

export interface ConditionScoreResult {
  score: number;
  label: ConditionScoreLabel;
  factors: string[];
  criticalIssues: string[];
}

// ---------------------------------------------------------------------
// Recurring issue detection (section 34) — a real count, never an
// automated diagnosis.
// ---------------------------------------------------------------------
export interface RecurringIssueAlert {
  propertyId: string;
  propertyTitle: string;
  category: string;
  count: number;
  windowDays: number;
}

// ---------------------------------------------------------------------
// Dashboard (section 2)
// ---------------------------------------------------------------------
export interface MaintenanceDashboardStats {
  totalRequests: number;
  openRequests: number;
  highPriorityRequests: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  upcomingPreventiveMaintenance: number;
  maintenanceExpenditure: number;
  pendingVendorInvoices: number;
  averageResolutionHours: number | null;
  propertiesRequiringAttention: number;
}
