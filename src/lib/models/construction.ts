// ---------------------------------------------------------------------
// Complete Construction Project Management System (new module).
//
// Terminology discipline: every "estimated" figure is labeled as such
// and never presented as confirmed/actual; committed/actual/remaining/
// variance figures are always DERIVED live from real rows (never
// stored, never drift). Customer-facing types never carry internal
// cost/contractor pricing/private notes — the same discipline STEP 24
// (investment) and STEP 25 (maintenance) already established.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Construction projects (sections 3-5)
// ---------------------------------------------------------------------
export type ConstructionProjectType =
  | "Residential Construction"
  | "Commercial Construction"
  | "Renovation"
  | "Interior Fit-Out"
  | "Villa Construction"
  | "Apartment Construction"
  | "Office Construction"
  | "Retail Construction"
  | "Infrastructure"
  | "Maintenance Construction"
  | "Other";
export const constructionProjectTypes: ConstructionProjectType[] = [
  "Residential Construction",
  "Commercial Construction",
  "Renovation",
  "Interior Fit-Out",
  "Villa Construction",
  "Apartment Construction",
  "Office Construction",
  "Retail Construction",
  "Infrastructure",
  "Maintenance Construction",
  "Other",
];

export type ConstructionProjectStatus = "PLANNING" | "APPROVAL_PENDING" | "APPROVED" | "MOBILIZATION" | "IN_PROGRESS" | "ON_HOLD" | "DELAYED" | "PRACTICALLY_COMPLETE" | "COMPLETED" | "CANCELLED";
export const constructionProjectStatuses: ConstructionProjectStatus[] = ["PLANNING", "APPROVAL_PENDING", "APPROVED", "MOBILIZATION", "IN_PROGRESS", "ON_HOLD", "DELAYED", "PRACTICALLY_COMPLETE", "COMPLETED", "CANCELLED"];

/** Server-enforced (never trust the frontend) — mirrors the
 *  ALLOWED_TRANSITIONS pattern used throughout this codebase. */
export const CONSTRUCTION_PROJECT_ALLOWED_TRANSITIONS: Record<ConstructionProjectStatus, ConstructionProjectStatus[]> = {
  PLANNING: ["APPROVAL_PENDING", "CANCELLED"],
  APPROVAL_PENDING: ["APPROVED", "PLANNING", "CANCELLED"],
  APPROVED: ["MOBILIZATION", "CANCELLED"],
  MOBILIZATION: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "DELAYED", "PRACTICALLY_COMPLETE", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  DELAYED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  PRACTICALLY_COMPLETE: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface ConstructionProject {
  id: string;
  projectNumber: string;
  projectName: string;
  referenceProjectId?: string;
  referenceProjectName?: string;
  propertyId?: string;
  propertyTitle?: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  dealNumber?: string;
  location?: string;
  projectType: ConstructionProjectType;
  description?: string;
  startDate?: string;
  plannedCompletionDate?: string;
  actualCompletionDate?: string;
  status: ConstructionProjectStatus;
  projectManagerId?: string;
  projectManagerName?: string;
  siteManagerId?: string;
  siteManagerName?: string;
  approvedBudget?: number;
  contractValue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionProjectInput = {
  projectName: string;
  referenceProjectId?: string;
  propertyId?: string;
  customerId?: string;
  dealId?: string;
  location?: string;
  projectType: ConstructionProjectType;
  description?: string;
  startDate?: string;
  plannedCompletionDate?: string;
  projectManagerId?: string;
  siteManagerId?: string;
  approvedBudget?: number;
  contractValue?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Phases (section 6)
// ---------------------------------------------------------------------
export type PhaseStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "ON_HOLD" | "CANCELLED";
export const phaseStatuses: PhaseStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED", "ON_HOLD", "CANCELLED"];

export interface ConstructionPhase {
  id: string;
  projectId: string;
  name: string;
  sequence: number;
  plannedStart?: string;
  plannedFinish?: string;
  actualStart?: string;
  actualFinish?: string;
  weight: number;
  progress: number;
  status: PhaseStatus;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionPhaseInput = {
  name: string;
  sequence?: number;
  plannedStart?: string;
  plannedFinish?: string;
  weight?: number;
  responsiblePersonId?: string;
  notes?: string;
};

export const SUGGESTED_PHASE_NAMES = [
  "Site Preparation",
  "Excavation",
  "Foundation",
  "Structure",
  "Brickwork",
  "Plaster",
  "Electrical",
  "Plumbing",
  "Roofing",
  "Flooring",
  "Doors & Windows",
  "Painting",
  "Kitchen",
  "Bathrooms",
  "HVAC",
  "External Works",
  "Landscaping",
  "Final Inspection",
  "Handover",
];

// ---------------------------------------------------------------------
// Milestones (section 8)
// ---------------------------------------------------------------------
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "CANCELLED";
export const milestoneStatuses: MilestoneStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED", "CANCELLED"];

export interface ConstructionMilestone {
  id: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  name: string;
  plannedDate?: string;
  actualDate?: string;
  status: MilestoneStatus;
  weight: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionMilestoneInput = {
  phaseId?: string;
  name: string;
  plannedDate?: string;
  weight?: number;
  notes?: string;
};

export const SUGGESTED_MILESTONE_NAMES = ["Foundation Complete", "Structure Complete", "Roof Complete", "MEP Complete", "Finishing Complete", "Final Inspection", "Handover"];

// ---------------------------------------------------------------------
// Tasks + dependencies (sections 9-10)
// ---------------------------------------------------------------------
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export const taskPriorities: TaskPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
export const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];

export const TASK_ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["BLOCKED", "COMPLETED", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface ConstructionTask {
  id: string;
  taskNumber: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  title: string;
  description?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  contractorId?: string;
  contractorName?: string;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  notes?: string;
  dependsOnTaskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ConstructionTaskInput = {
  phaseId?: string;
  title: string;
  description?: string;
  assignedUserId?: string;
  contractorId?: string;
  startDate?: string;
  dueDate?: string;
  priority?: TaskPriority;
  notes?: string;
  dependsOnTaskIds?: string[];
};

// ---------------------------------------------------------------------
// BOQ (sections 12-13)
// ---------------------------------------------------------------------
export type BoqStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export const boqStatuses: BoqStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export type BoqCategory = "Civil" | "Structure" | "Brickwork" | "Concrete" | "Steel" | "Electrical" | "Plumbing" | "HVAC" | "Flooring" | "Painting" | "Woodwork" | "Aluminum" | "Glass" | "Kitchen" | "Sanitary" | "External Works" | "Labor" | "Other";
export const boqCategories: BoqCategory[] = ["Civil", "Structure", "Brickwork", "Concrete", "Steel", "Electrical", "Plumbing", "HVAC", "Flooring", "Painting", "Woodwork", "Aluminum", "Glass", "Kitchen", "Sanitary", "External Works", "Labor", "Other"];

export interface ConstructionBoq {
  id: string;
  boqNumber: string;
  projectId: string;
  status: BoqStatus;
  createdByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConstructionBoqItem {
  id: string;
  boqId: string;
  category: BoqCategory;
  section?: string;
  item: string;
  description?: string;
  unit: string;
  quantity: number;
  estimatedRate: number;
  estimatedAmount: number;
  approvedRate?: number;
  approvedAmount?: number;
  actualQuantity?: number;
  actualRate?: number;
  actualAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionBoqItemInput = {
  category: BoqCategory;
  section?: string;
  item: string;
  description?: string;
  unit: string;
  quantity: number;
  estimatedRate: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Materials + movements + requests (sections 14-16)
// ---------------------------------------------------------------------
export type MaterialCategory = "Cement" | "Steel" | "Bricks" | "Sand" | "Crush" | "Tiles" | "Paint" | "Pipes" | "Electrical Cable" | "Sanitary Items" | "Wood" | "Glass" | "Other";
export const materialCategories: MaterialCategory[] = ["Cement", "Steel", "Bricks", "Sand", "Crush", "Tiles", "Paint", "Pipes", "Electrical Cable", "Sanitary Items", "Wood", "Glass", "Other"];

export interface ConstructionMaterial {
  id: string;
  materialCode: string;
  projectId: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  requiredQuantity: number;
  orderedQuantity: number;
  receivedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  reorderThreshold?: number;
  estimatedRate?: number;
  actualRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionMaterialInput = {
  materialCode: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  requiredQuantity?: number;
  reorderThreshold?: number;
  estimatedRate?: number;
  actualRate?: number;
  notes?: string;
};

export type MaterialMovementType = "ORDERED" | "RECEIVED" | "ISSUED" | "RETURNED" | "ADJUSTED";
export const materialMovementTypes: MaterialMovementType[] = ["ORDERED", "RECEIVED", "ISSUED", "RETURNED", "ADJUSTED"];

export interface ConstructionMaterialMovement {
  id: string;
  materialId: string;
  movementType: MaterialMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  createdByName?: string;
  createdAt: string;
}

export type MaterialRequestPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export const materialRequestPriorities: MaterialRequestPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export type MaterialRequestStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
export const materialRequestStatuses: MaterialRequestStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

export const MATERIAL_REQUEST_ALLOWED_TRANSITIONS: Record<MaterialRequestStatus, MaterialRequestStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  REJECTED: [],
  ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

export interface ConstructionMaterialRequest {
  id: string;
  requestNumber: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  materialId?: string;
  materialName?: string;
  requestedByName?: string;
  quantity: number;
  requiredDate?: string;
  priority: MaterialRequestPriority;
  reason?: string;
  status: MaterialRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionMaterialRequestInput = {
  phaseId?: string;
  materialId?: string;
  materialName?: string;
  quantity: number;
  requiredDate?: string;
  priority?: MaterialRequestPriority;
  reason?: string;
};

// ---------------------------------------------------------------------
// Purchase orders (sections 17-18) — vendor identity reused from
// maintenance_vendors (see migration DESIGN NOTES).
// ---------------------------------------------------------------------
export type PurchaseOrderStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
export const purchaseOrderStatuses: PurchaseOrderStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

export const PURCHASE_ORDER_ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

export interface ConstructionPurchaseOrderItem {
  id: string;
  poId: string;
  materialId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ConstructionPurchaseOrder {
  id: string;
  poNumber: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  status: PurchaseOrderStatus;
  expectedDelivery?: string;
  taxPercent: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  createdByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  items?: ConstructionPurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type ConstructionPurchaseOrderItemInput = { materialId?: string; description: string; quantity: number; rate: number };

export type ConstructionPurchaseOrderInput = {
  vendorId: string;
  expectedDelivery?: string;
  taxPercent?: number;
  discountAmount?: number;
  notes?: string;
  items: ConstructionPurchaseOrderItemInput[];
};

// ---------------------------------------------------------------------
// Contractors (section 19) — per-project engagement; identity lives in
// maintenance_vendors.
// ---------------------------------------------------------------------
export type ContractorStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "COMPLETED";
export const contractorStatuses: ContractorStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "COMPLETED"];

export interface ConstructionContractor {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  serviceCategory?: string;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  status: ContractorStatus;
  performanceNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionContractorInput = {
  vendorId: string;
  serviceCategory?: string;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// Construction work orders (section 20) — distinct from maintenance's.
// ---------------------------------------------------------------------
export type ConstructionWorkOrderStatus = "ASSIGNED" | "STARTED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "CANCELLED";
export const constructionWorkOrderStatuses: ConstructionWorkOrderStatus[] = ["ASSIGNED", "STARTED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "CANCELLED"];

export const CONSTRUCTION_WORK_ORDER_ALLOWED_TRANSITIONS: Record<ConstructionWorkOrderStatus, ConstructionWorkOrderStatus[]> = {
  ASSIGNED: ["STARTED", "CANCELLED"],
  STARTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["VERIFIED"],
  VERIFIED: [],
  CANCELLED: [],
};

export interface ConstructionWorkOrder {
  id: string;
  workOrderNumber: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  contractorId: string;
  contractorName?: string;
  scope: string;
  contractAmount?: number;
  startDate?: string;
  dueDate?: string;
  progress: number;
  status: ConstructionWorkOrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionWorkOrderInput = {
  phaseId?: string;
  contractorId: string;
  scope: string;
  contractAmount?: number;
  startDate?: string;
  dueDate?: string;
};

// ---------------------------------------------------------------------
// Labor (section 21) — cost tracking only, never payroll.
// ---------------------------------------------------------------------
export type LaborTrade = "Mason" | "Electrician" | "Plumber" | "Carpenter" | "Painter" | "Welder" | "Tile Worker" | "HVAC Technician" | "General Labor" | "Other";
export const laborTrades: LaborTrade[] = ["Mason", "Electrician", "Plumber", "Carpenter", "Painter", "Welder", "Tile Worker", "HVAC Technician", "General Labor", "Other"];

export interface ConstructionLaborRecord {
  id: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  workerOrTeam: string;
  trade: LaborTrade;
  recordDate: string;
  hours: number;
  dailyRate?: number;
  overtimeHours: number;
  overtimeRate?: number;
  totalLaborCost: number;
  notes?: string;
  createdAt: string;
}

export type ConstructionLaborRecordInput = {
  phaseId?: string;
  workerOrTeam: string;
  trade: LaborTrade;
  recordDate?: string;
  hours: number;
  dailyRate?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Equipment (section 22)
// ---------------------------------------------------------------------
export type EquipmentCategory = "Generator" | "Excavator" | "Crane" | "Concrete Mixer" | "Scaffolding" | "Compactor" | "Vehicle" | "Other";
export const equipmentCategories: EquipmentCategory[] = ["Generator", "Excavator", "Crane", "Concrete Mixer", "Scaffolding", "Compactor", "Vehicle", "Other"];

export type EquipmentMaintenanceStatus = "OPERATIONAL" | "UNDER_MAINTENANCE" | "OUT_OF_SERVICE";
export const equipmentMaintenanceStatuses: EquipmentMaintenanceStatus[] = ["OPERATIONAL", "UNDER_MAINTENANCE", "OUT_OF_SERVICE"];

export interface ConstructionEquipment {
  id: string;
  projectId: string;
  equipmentName: string;
  category: EquipmentCategory;
  ownerOrVendor?: string;
  assetId?: string;
  startDate?: string;
  endDate?: string;
  usageHours?: number;
  rentalRate?: number;
  maintenanceStatus: EquipmentMaintenanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionEquipmentInput = {
  equipmentName: string;
  category: EquipmentCategory;
  ownerOrVendor?: string;
  assetId?: string;
  startDate?: string;
  endDate?: string;
  usageHours?: number;
  rentalRate?: number;
  maintenanceStatus?: EquipmentMaintenanceStatus;
  notes?: string;
};

// ---------------------------------------------------------------------
// Budget (section 23) — only budgeted_amount is stored; the rest is
// always derived live (see BudgetLineSummary in the report layer).
// ---------------------------------------------------------------------
export type BudgetCategory = "Materials" | "Labor" | "Contractors" | "Equipment" | "Transportation" | "Permits" | "Consultants" | "Utilities" | "Other";
export const budgetCategories: BudgetCategory[] = ["Materials", "Labor", "Contractors", "Equipment", "Transportation", "Permits", "Consultants", "Utilities", "Other"];

export interface ConstructionBudgetLine {
  id: string;
  projectId: string;
  category: BudgetCategory;
  budgetedAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionBudgetLineInput = { category: BudgetCategory; budgetedAmount: number; notes?: string };

/** Computed, never stored — section 23's committed/actual/remaining/
 *  variance, derived live from real expenses/POs/work orders. */
export interface BudgetLineSummary {
  category: BudgetCategory;
  budgetedAmount: number;
  committedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  varianceAmount: number;
}

// ---------------------------------------------------------------------
// Expenses (section 24) — integrates with the existing accounting
// module; never a parallel ledger.
// ---------------------------------------------------------------------
export type ConstructionExpenseStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";
export const constructionExpenseStatuses: ConstructionExpenseStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID"];

export const CONSTRUCTION_EXPENSE_ALLOWED_TRANSITIONS: Record<ConstructionExpenseStatus, ConstructionExpenseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
  REJECTED: [],
  PAID: [],
};

export interface ConstructionExpense {
  id: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  boqItemId?: string;
  vendorId?: string;
  vendorName?: string;
  contractorId?: string;
  contractorName?: string;
  category: BudgetCategory;
  description: string;
  amount: number;
  status: ConstructionExpenseStatus;
  expenseId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionExpenseInput = {
  phaseId?: string;
  boqItemId?: string;
  vendorId?: string;
  contractorId?: string;
  category: BudgetCategory;
  description: string;
  amount: number;
};

// ---------------------------------------------------------------------
// Change orders (sections 26-27)
// ---------------------------------------------------------------------
export type ChangeOrderStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "IMPLEMENTED" | "CANCELLED";
export const changeOrderStatuses: ChangeOrderStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "IMPLEMENTED", "CANCELLED"];

export const CHANGE_ORDER_ALLOWED_TRANSITIONS: Record<ChangeOrderStatus, ChangeOrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["IMPLEMENTED"],
  REJECTED: [],
  IMPLEMENTED: [],
  CANCELLED: [],
};

export interface ConstructionChangeOrder {
  id: string;
  changeOrderNumber: string;
  projectId: string;
  description: string;
  reason?: string;
  requestedByName?: string;
  costImpact: number;
  scheduleImpactDays: number;
  status: ChangeOrderStatus;
  approvedByName?: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionChangeOrderInput = { description: string; reason?: string; costImpact?: number; scheduleImpactDays?: number };

// ---------------------------------------------------------------------
// Site reports + media (sections 28-29)
// ---------------------------------------------------------------------
export interface ConstructionSiteReport {
  id: string;
  reportNumber: string;
  projectId: string;
  reportDate: string;
  siteManagerName?: string;
  weather?: string;
  workersPresent?: number;
  contractorsPresent?: string;
  workCompleted?: string;
  workPlanned?: string;
  materialsReceived?: string;
  equipmentUsed?: string;
  issues?: string;
  safetyIncidents?: string;
  delays?: string;
  visitors?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionSiteReportInput = {
  reportDate?: string;
  weather?: string;
  workersPresent?: number;
  contractorsPresent?: string;
  workCompleted?: string;
  workPlanned?: string;
  materialsReceived?: string;
  equipmentUsed?: string;
  issues?: string;
  safetyIncidents?: string;
  delays?: string;
  visitors?: string;
  notes?: string;
};

export type SiteMediaType = "PHOTO" | "VIDEO";

export interface ConstructionSiteMedia {
  id: string;
  projectId: string;
  phaseId?: string;
  taskId?: string;
  reportId?: string;
  inspectionId?: string;
  mediaType: SiteMediaType;
  storagePath: string;
  caption?: string;
  customerVisible: boolean;
  uploadedByName?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Quality control (section 30)
// ---------------------------------------------------------------------
export type QualityCategory = "Concrete" | "Steel" | "Brickwork" | "Plaster" | "Electrical" | "Plumbing" | "Waterproofing" | "Flooring" | "Painting" | "Doors/Windows" | "Finishing" | "Other";
export const qualityCategories: QualityCategory[] = ["Concrete", "Steel", "Brickwork", "Plaster", "Electrical", "Plumbing", "Waterproofing", "Flooring", "Painting", "Doors/Windows", "Finishing", "Other"];

export type QualityResult = "PASSED" | "FAILED" | "CONDITIONAL" | "REQUIRES_REVIEW";
export const qualityResults: QualityResult[] = ["PASSED", "FAILED", "CONDITIONAL", "REQUIRES_REVIEW"];

export interface ConstructionQualityInspection {
  id: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  category: QualityCategory;
  inspectorName?: string;
  inspectionDate: string;
  result: QualityResult;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionQualityInspectionInput = { phaseId?: string; category: QualityCategory; inspectionDate?: string; result?: QualityResult; notes?: string };

export type QualityIssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED";
export const qualityIssueStatuses: QualityIssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED", "CLOSED"];

export interface ConstructionQualityIssue {
  id: string;
  inspectionId: string;
  description: string;
  correctiveAction?: string;
  responsibleParty?: string;
  dueDate?: string;
  status: QualityIssueStatus;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionQualityIssueInput = { description: string; correctiveAction?: string; responsibleParty?: string; dueDate?: string };

// ---------------------------------------------------------------------
// Safety (section 31) — never presented as legal-compliance
// certification.
// ---------------------------------------------------------------------
export type SafetyRecordType = "INSPECTION" | "HAZARD" | "INCIDENT" | "NEAR_MISS";
export const safetyRecordTypes: SafetyRecordType[] = ["INSPECTION", "HAZARD", "INCIDENT", "NEAR_MISS"];

export type SafetyStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export const safetyStatuses: SafetyStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export interface ConstructionSafetyRecord {
  id: string;
  projectId: string;
  recordType: SafetyRecordType;
  description: string;
  reportedByName?: string;
  recordDate: string;
  correctiveAction?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  dueDate?: string;
  status: SafetyStatus;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionSafetyRecordInput = { recordType: SafetyRecordType; description: string; recordDate?: string; correctiveAction?: string; responsiblePersonId?: string; dueDate?: string };

// ---------------------------------------------------------------------
// Delays (section 32) — never auto-assigns blame.
// ---------------------------------------------------------------------
export type DelayReason = "Weather" | "Material Delay" | "Labor" | "Design Change" | "Approval" | "Contractor" | "Client" | "Site Condition" | "Other";
export const delayReasons: DelayReason[] = ["Weather", "Material Delay", "Labor", "Design Change", "Approval", "Contractor", "Client", "Site Condition", "Other"];

export interface ConstructionDelay {
  id: string;
  projectId: string;
  phaseId?: string;
  phaseName?: string;
  taskId?: string;
  taskTitle?: string;
  reason: DelayReason;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  responsibility?: string;
  impact?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionDelayInput = { phaseId?: string; taskId?: string; reason: DelayReason; startDate: string; endDate?: string; responsibility?: string; impact?: string; notes?: string };

// ---------------------------------------------------------------------
// Risk register (section 44) — never claims a risk will occur.
// ---------------------------------------------------------------------
export type RiskCategory = "Cost" | "Schedule" | "Quality" | "Safety" | "Material" | "Contractor" | "Design" | "Approval" | "External" | "Other";
export const riskCategories: RiskCategory[] = ["Cost", "Schedule", "Quality", "Safety", "Material", "Contractor", "Design", "Approval", "External", "Other"];

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export const riskLevels: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

export type RiskStatus = "OPEN" | "MONITORING" | "MITIGATED" | "CLOSED" | "OCCURRED";
export const riskStatuses: RiskStatus[] = ["OPEN", "MONITORING", "MITIGATED", "CLOSED", "OCCURRED"];

export interface ConstructionRisk {
  id: string;
  projectId: string;
  risk: string;
  category: RiskCategory;
  probability: RiskLevel;
  impact: RiskLevel;
  riskScore: number;
  ownerName?: string;
  mitigation?: string;
  status: RiskStatus;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionRiskInput = { risk: string; category: RiskCategory; probability: RiskLevel; impact: RiskLevel; ownerId?: string; mitigation?: string; reviewDate?: string };

// ---------------------------------------------------------------------
// Handover (section 37)
// ---------------------------------------------------------------------
export type HandoverStatus = "NOT_STARTED" | "PRACTICAL_COMPLETION" | "FINAL_INSPECTION" | "DEFECT_RESOLUTION" | "CUSTOMER_VERIFICATION" | "APPROVED" | "COMPLETED";
export const handoverStatuses: HandoverStatus[] = ["NOT_STARTED", "PRACTICAL_COMPLETION", "FINAL_INSPECTION", "DEFECT_RESOLUTION", "CUSTOMER_VERIFICATION", "APPROVED", "COMPLETED"];

export const HANDOVER_ALLOWED_TRANSITIONS: Record<HandoverStatus, HandoverStatus[]> = {
  NOT_STARTED: ["PRACTICAL_COMPLETION"],
  PRACTICAL_COMPLETION: ["FINAL_INSPECTION"],
  FINAL_INSPECTION: ["DEFECT_RESOLUTION"],
  DEFECT_RESOLUTION: ["CUSTOMER_VERIFICATION"],
  CUSTOMER_VERIFICATION: ["APPROVED"],
  APPROVED: ["COMPLETED"],
  COMPLETED: [],
};

export interface ConstructionHandover {
  id: string;
  projectId: string;
  practicalCompletionDate?: string;
  finalInspectionDate?: string;
  defectListCompleted: boolean;
  defectsResolved: boolean;
  customerVerified: boolean;
  customerVerifiedAt?: string;
  handoverApproved: boolean;
  handoverApprovedByName?: string;
  handoverDate?: string;
  status: HandoverStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Snags (section 38) — mirrors maintenance's property_defects shape.
// ---------------------------------------------------------------------
export type SnagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export const snagSeverities: SnagSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type SnagStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED";
export const snagStatuses: SnagStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFIED", "CLOSED"];

export const SNAG_ALLOWED_TRANSITIONS: Record<SnagStatus, SnagStatus[]> = {
  OPEN: ["ASSIGNED", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED"],
  RESOLVED: ["VERIFIED", "IN_PROGRESS"],
  VERIFIED: ["CLOSED"],
  CLOSED: [],
};

export interface ConstructionSnag {
  id: string;
  snagNumber: string;
  projectId: string;
  unitId?: string;
  unitNumber?: string;
  category: string;
  description: string;
  location?: string;
  severity: SnagSeverity;
  assignedContractorId?: string;
  assignedContractorName?: string;
  dueDate?: string;
  status: SnagStatus;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionSnagInput = { unitId?: string; category: string; description: string; location?: string; severity?: SnagSeverity; assignedContractorId?: string; dueDate?: string };

// ---------------------------------------------------------------------
// Approvals (section 34) — one polymorphic log for every workflow.
// ---------------------------------------------------------------------
export type ApprovalEntityType = "BUDGET" | "BOQ" | "PURCHASE_ORDER" | "MATERIAL_REQUEST" | "CHANGE_ORDER" | "WORK_ORDER" | "EXPENSE" | "PROJECT_COMPLETION";
export const approvalEntityTypes: ApprovalEntityType[] = ["BUDGET", "BOQ", "PURCHASE_ORDER", "MATERIAL_REQUEST", "CHANGE_ORDER", "WORK_ORDER", "EXPENSE", "PROJECT_COMPLETION"];

export type ApprovalDecision = "APPROVED" | "REJECTED" | "PENDING";

export interface ConstructionApproval {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  approverName?: string;
  decision: ApprovalDecision;
  comments?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Progress updates (sections 7, 36, 41)
// ---------------------------------------------------------------------
export type ProgressUpdateType = "OVERALL" | "PHASE" | "MILESTONE" | "TASK";

export interface ConstructionProgressUpdate {
  id: string;
  projectId: string;
  updateType: ProgressUpdateType;
  referenceId?: string;
  plannedPercent?: number;
  actualPercent?: number;
  notes?: string;
  customerVisible: boolean;
  createdByName?: string;
  createdAt: string;
}

/** Section 7 — planned/actual/variance, weighted across phases where
 *  weights are configured (never a naive average when weights exist). */
export interface ProjectProgressSummary {
  plannedPercent: number | null;
  actualPercent: number;
  variancePercent: number | null;
  usedWeighting: boolean;
}

// ---------------------------------------------------------------------
// Audit log (section 50)
// ---------------------------------------------------------------------
export interface ConstructionAuditLogEntry {
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
// Profitability (section 25) — ESTIMATED vs ACTUAL always distinguished.
// ---------------------------------------------------------------------
export interface ProjectProfitability {
  contractValue: number | null;
  approvedBudget: number | null;
  committedCost: number;
  actualCost: number;
  estimatedRemainingCost: number | null;
  estimatedProfit: number | null;
  actualRevenue: number | null;
  actualProfit: number | null;
}

// ---------------------------------------------------------------------
// Change order impact (section 27) — revised figures are always
// computed live from APPROVED change orders, never mutated on the
// project row itself.
// ---------------------------------------------------------------------
export interface ChangeOrderImpactSummary {
  originalContractValue: number | null;
  approvedCostChanges: number;
  revisedContractValue: number | null;
  originalCompletionDate: string | null;
  approvedScheduleChangeDays: number;
  revisedCompletionDate: string | null;
}

// ---------------------------------------------------------------------
// Dashboard (section 2)
// ---------------------------------------------------------------------
export interface ConstructionDashboardStats {
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  atRiskProjects: number;
  totalApprovedBudget: number;
  totalActualExpenditure: number;
  remainingBudget: number | null;
  pendingApprovals: number;
  openChangeOrders: number;
  materialShortages: number;
  upcomingMilestones: number;
  overdueTasks: number;
  activeContractors: number;
}

// ---------------------------------------------------------------------
// Budget alert thresholds (section 43) — configurable, never hardcoded.
// ---------------------------------------------------------------------
export interface ConstructionSettings {
  budgetAlertThresholds: number[];
  defaultRetentionPercent: number;
  currency: string;
  updatedAt: string;
}

export type ConstructionSettingsInput = Partial<Omit<ConstructionSettings, "updatedAt">>;
