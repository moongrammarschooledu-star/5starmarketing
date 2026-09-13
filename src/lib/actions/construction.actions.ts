"use server";

import { revalidatePath } from "next/cache";
import { constructionProjectService } from "@/services/constructionProjectService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { constructionTaskService } from "@/services/constructionTaskService";
import { constructionBoqService } from "@/services/constructionBoqService";
import { constructionMaterialService } from "@/services/constructionMaterialService";
import { constructionProcurementService } from "@/services/constructionProcurementService";
import { constructionContractorService } from "@/services/constructionContractorService";
import { constructionLaborService } from "@/services/constructionLaborService";
import { constructionEquipmentService } from "@/services/constructionEquipmentService";
import { constructionBudgetService } from "@/services/constructionBudgetService";
import { constructionExpenseService } from "@/services/constructionExpenseService";
import { constructionChangeOrderService } from "@/services/constructionChangeOrderService";
import { constructionSiteReportService } from "@/services/constructionSiteReportService";
import { constructionQualityService } from "@/services/constructionQualityService";
import { constructionSafetyService } from "@/services/constructionSafetyService";
import { constructionDelayService } from "@/services/constructionDelayService";
import { constructionRiskService } from "@/services/constructionRiskService";
import { constructionHandoverService } from "@/services/constructionHandoverService";
import { constructionSnagService } from "@/services/constructionSnagService";
import { constructionApprovalService } from "@/services/constructionApprovalService";
import { constructionProgressService } from "@/services/constructionProgressService";
import { constructionSettingsService } from "@/services/constructionSettingsService";
import { constructionPdfService } from "@/services/constructionPdfService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { canAccess, canManageConstruction } from "@/lib/permissions";
import type {
  ConstructionProjectInput,
  ConstructionProjectStatus,
  ConstructionPhaseInput,
  PhaseStatus,
  ConstructionMilestoneInput,
  MilestoneStatus,
  ConstructionTaskInput,
  TaskStatus,
  BoqStatus,
  ConstructionBoqItemInput,
  ConstructionMaterialInput,
  MaterialMovementType,
  ConstructionMaterialRequestInput,
  MaterialRequestStatus,
  ConstructionPurchaseOrderInput,
  PurchaseOrderStatus,
  ConstructionContractorInput,
  ContractorStatus,
  ConstructionWorkOrderInput,
  ConstructionWorkOrderStatus,
  ConstructionLaborRecordInput,
  ConstructionEquipmentInput,
  EquipmentMaintenanceStatus,
  ConstructionBudgetLineInput,
  ConstructionExpenseInput,
  ConstructionExpenseStatus,
  ConstructionChangeOrderInput,
  ChangeOrderStatus,
  ConstructionSiteReportInput,
  SiteMediaType,
  ConstructionQualityInspectionInput,
  QualityResult,
  ConstructionQualityIssueInput,
  QualityIssueStatus,
  ConstructionSafetyRecordInput,
  SafetyStatus,
  ConstructionDelayInput,
  ConstructionRiskInput,
  RiskStatus,
  HandoverStatus,
  ConstructionSnagInput,
  SnagStatus,
  ApprovalEntityType,
  ApprovalDecision,
  ProgressUpdateType,
  ConstructionSettingsInput,
} from "@/lib/models/construction";

async function requireConstructionAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "construction")) throw new Error("Not authorized.");
  return admin;
}

async function requireConstructionManageAccess() {
  const admin = await requireConstructionAccess();
  if (!canManageConstruction(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateProject(projectId: string) {
  revalidatePath("/admin/construction");
  revalidatePath("/admin/construction/dashboard");
  revalidatePath("/admin/construction/projects");
  revalidatePath(`/admin/construction/projects/${projectId}`);
  revalidatePath("/customer/construction");
}

// ---- Projects ----
export async function createConstructionProjectAction(input: ConstructionProjectInput) {
  const admin = await requireConstructionManageAccess();
  const project = await constructionProjectService.create(input, admin.id, admin.name);
  revalidatePath("/admin/construction/projects");
  return project;
}
export async function updateConstructionProjectAction(id: string, input: Partial<ConstructionProjectInput>) {
  const admin = await requireConstructionManageAccess();
  await constructionProjectService.update(id, input, admin.id, admin.name);
  revalidateProject(id);
}
export async function updateConstructionProjectStatusAction(id: string, status: ConstructionProjectStatus) {
  const admin = await requireConstructionAccess();
  const project = await constructionProjectService.updateStatus(id, status, admin.id, admin.name);
  revalidateProject(id);
  return project;
}

// ---- Phases ----
export async function createPhaseAction(projectId: string, input: ConstructionPhaseInput) {
  const admin = await requireConstructionAccess();
  const phase = await constructionPhaseService.create(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return phase;
}
export async function updatePhaseAction(id: string, projectId: string, input: Partial<ConstructionPhaseInput> & { progress?: number; status?: PhaseStatus; actualStart?: string; actualFinish?: string }) {
  const admin = await requireConstructionAccess();
  await constructionPhaseService.update(id, input, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function removePhaseAction(id: string, projectId: string) {
  await requireConstructionAccess();
  await constructionPhaseService.remove(id);
  revalidateProject(projectId);
}

// ---- Milestones ----
export async function createMilestoneAction(projectId: string, input: ConstructionMilestoneInput) {
  const admin = await requireConstructionAccess();
  const milestone = await constructionPhaseService.createMilestone(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return milestone;
}
export async function updateMilestoneStatusAction(id: string, projectId: string, status: MilestoneStatus) {
  const admin = await requireConstructionAccess();
  await constructionPhaseService.updateMilestoneStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function removeMilestoneAction(id: string, projectId: string) {
  await requireConstructionAccess();
  await constructionPhaseService.removeMilestone(id);
  revalidateProject(projectId);
}

// ---- Tasks ----
export async function createTaskAction(projectId: string, input: ConstructionTaskInput) {
  const admin = await requireConstructionAccess();
  const task = await constructionTaskService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return task;
}
export async function updateTaskStatusAction(id: string, projectId: string, status: TaskStatus) {
  const admin = await requireConstructionAccess();
  const task = await constructionTaskService.updateStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
  return task;
}
export async function updateTaskProgressAction(id: string, projectId: string, progress: number) {
  await requireConstructionAccess();
  await constructionTaskService.updateProgress(id, progress);
  revalidateProject(projectId);
}
export async function addTaskDependencyAction(taskId: string, dependsOnTaskId: string, projectId: string) {
  await requireConstructionAccess();
  await constructionTaskService.addDependency(taskId, dependsOnTaskId);
  revalidateProject(projectId);
}
export async function removeTaskDependencyAction(taskId: string, dependsOnTaskId: string, projectId: string) {
  await requireConstructionAccess();
  await constructionTaskService.removeDependency(taskId, dependsOnTaskId);
  revalidateProject(projectId);
}

// ---- BOQ ----
export async function ensureBoqAction(projectId: string) {
  const admin = await requireConstructionAccess();
  return constructionBoqService.ensureForProject(projectId, admin.id);
}
export async function updateBoqStatusAction(boqId: string, projectId: string, status: BoqStatus) {
  const admin = await requireConstructionManageAccess();
  await constructionBoqService.updateStatus(boqId, status, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function addBoqItemAction(boqId: string, projectId: string, input: ConstructionBoqItemInput) {
  await requireConstructionAccess();
  const item = await constructionBoqService.addItem(boqId, input);
  revalidateProject(projectId);
  return item;
}
export async function setBoqApprovedRateAction(itemId: string, projectId: string, approvedRate: number) {
  await requireConstructionManageAccess();
  await constructionBoqService.setApprovedRate(itemId, approvedRate);
  revalidateProject(projectId);
}
export async function setBoqActualsAction(itemId: string, projectId: string, actualQuantity: number, actualRate: number) {
  await requireConstructionAccess();
  await constructionBoqService.setActuals(itemId, actualQuantity, actualRate);
  revalidateProject(projectId);
}
export async function removeBoqItemAction(itemId: string, projectId: string) {
  await requireConstructionAccess();
  await constructionBoqService.removeItem(itemId);
  revalidateProject(projectId);
}

// ---- Materials ----
export async function createMaterialAction(projectId: string, input: ConstructionMaterialInput) {
  const admin = await requireConstructionAccess();
  const material = await constructionMaterialService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return material;
}
export async function updateMaterialAction(id: string, projectId: string, input: Partial<ConstructionMaterialInput>) {
  await requireConstructionAccess();
  await constructionMaterialService.update(id, input);
  revalidateProject(projectId);
}
export async function recordMaterialMovementAction(materialId: string, projectId: string, movementType: MaterialMovementType, quantity: number, reference?: string, notes?: string) {
  const admin = await requireConstructionAccess();
  await constructionMaterialService.recordMovement(materialId, movementType, quantity, admin.id, reference, notes);
  revalidateProject(projectId);
}
export async function createMaterialRequestAction(projectId: string, input: ConstructionMaterialRequestInput) {
  const admin = await requireConstructionAccess();
  const request = await constructionMaterialService.createRequest(projectId, input, admin.id);
  revalidateProject(projectId);
  return request;
}
export async function updateMaterialRequestStatusAction(id: string, projectId: string, status: MaterialRequestStatus) {
  const admin = await requireConstructionAccess();
  await constructionMaterialService.updateRequestStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
}

// ---- Procurement (purchase orders) ----
export async function createPurchaseOrderAction(projectId: string, input: ConstructionPurchaseOrderInput) {
  const admin = await requireConstructionManageAccess();
  const po = await constructionProcurementService.create(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return po;
}
export async function updatePurchaseOrderStatusAction(id: string, projectId: string, status: PurchaseOrderStatus) {
  const admin = await requireConstructionManageAccess();
  const po = await constructionProcurementService.updateStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
  return po;
}

// ---- Contractors + construction work orders ----
export async function createContractorAction(projectId: string, input: ConstructionContractorInput) {
  const admin = await requireConstructionManageAccess();
  const contractor = await constructionContractorService.create(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return contractor;
}
export async function setContractorStatusAction(id: string, projectId: string, status: ContractorStatus) {
  const admin = await requireConstructionManageAccess();
  await constructionContractorService.setStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function setContractorPerformanceNotesAction(id: string, projectId: string, notes: string) {
  await requireConstructionManageAccess();
  await constructionContractorService.setPerformanceNotes(id, notes);
  revalidateProject(projectId);
}
export async function createConstructionWorkOrderAction(projectId: string, input: ConstructionWorkOrderInput) {
  const admin = await requireConstructionAccess();
  const workOrder = await constructionContractorService.createWorkOrder(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return workOrder;
}
export async function updateConstructionWorkOrderStatusAction(id: string, projectId: string, status: ConstructionWorkOrderStatus) {
  const admin = await requireConstructionAccess();
  await constructionContractorService.updateWorkOrderStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function updateConstructionWorkOrderProgressAction(id: string, projectId: string, progress: number) {
  await requireConstructionAccess();
  await constructionContractorService.updateWorkOrderProgress(id, progress);
  revalidateProject(projectId);
}

// ---- Labor ----
export async function createLaborRecordAction(projectId: string, input: ConstructionLaborRecordInput) {
  const admin = await requireConstructionAccess();
  const record = await constructionLaborService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return record;
}
export async function removeLaborRecordAction(id: string, projectId: string) {
  await requireConstructionAccess();
  await constructionLaborService.remove(id);
  revalidateProject(projectId);
}

// ---- Equipment ----
export async function createEquipmentAction(projectId: string, input: ConstructionEquipmentInput) {
  const admin = await requireConstructionAccess();
  const equipment = await constructionEquipmentService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return equipment;
}
export async function updateEquipmentAction(id: string, projectId: string, input: Partial<ConstructionEquipmentInput>) {
  await requireConstructionAccess();
  await constructionEquipmentService.update(id, input);
  revalidateProject(projectId);
}
export async function setEquipmentMaintenanceStatusAction(id: string, projectId: string, status: EquipmentMaintenanceStatus) {
  await requireConstructionAccess();
  await constructionEquipmentService.setMaintenanceStatus(id, status);
  revalidateProject(projectId);
}

// ---- Budget ----
export async function upsertBudgetLineAction(projectId: string, input: ConstructionBudgetLineInput) {
  const admin = await requireConstructionManageAccess();
  const line = await constructionBudgetService.upsertLine(projectId, input, admin.id);
  revalidateProject(projectId);
  return line;
}

// ---- Expenses ----
export async function createConstructionExpenseAction(projectId: string, input: ConstructionExpenseInput) {
  const admin = await requireConstructionAccess();
  const expense = await constructionExpenseService.create(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return expense;
}
export async function updateConstructionExpenseStatusAction(id: string, projectId: string, status: ConstructionExpenseStatus) {
  const admin = status === "APPROVED" || status === "PAID" ? await requireConstructionManageAccess() : await requireConstructionAccess();
  const expense = await constructionExpenseService.updateStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
  revalidatePath("/admin/accounting/expenses");
  return expense;
}

// ---- Change orders ----
export async function createChangeOrderAction(projectId: string, input: ConstructionChangeOrderInput) {
  const admin = await requireConstructionAccess();
  const co = await constructionChangeOrderService.create(projectId, input, admin.id, admin.name);
  revalidateProject(projectId);
  return co;
}
export async function updateChangeOrderStatusAction(id: string, projectId: string, status: ChangeOrderStatus) {
  const admin = status === "APPROVED" || status === "REJECTED" ? await requireConstructionManageAccess() : await requireConstructionAccess();
  const co = await constructionChangeOrderService.updateStatus(id, status, admin.id, admin.name);
  revalidateProject(projectId);
  return co;
}

// ---- Site reports + media ----
export async function createSiteReportAction(projectId: string, input: ConstructionSiteReportInput) {
  const admin = await requireConstructionAccess();
  const report = await constructionSiteReportService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return report;
}
export async function uploadSiteMediaAction(input: { projectId: string; phaseId?: string; taskId?: string; reportId?: string; inspectionId?: string; mediaType: SiteMediaType; dataUri: string; caption?: string; customerVisible?: boolean }) {
  const admin = await requireConstructionAccess();
  const media = await constructionSiteReportService.uploadMedia(input, admin.id);
  revalidateProject(input.projectId);
  return media;
}
export async function setSiteMediaCustomerVisibleAction(mediaId: string, projectId: string, visible: boolean) {
  await requireConstructionAccess();
  await constructionSiteReportService.setCustomerVisible(mediaId, visible);
  revalidateProject(projectId);
}
export async function getSiteMediaUrlAction(mediaId: string) {
  const admin = await profileService.getCurrentAdmin();
  const customer = admin ? null : await customerService.getCurrentCustomer();
  if (!admin && !customer) throw new Error("Not authorized.");
  return constructionSiteReportService.getMediaSignedUrl(mediaId);
}
export async function removeSiteMediaAction(mediaId: string, projectId: string) {
  await requireConstructionAccess();
  await constructionSiteReportService.removeMedia(mediaId);
  revalidateProject(projectId);
}

// ---- Quality ----
export async function createQualityInspectionAction(projectId: string, input: ConstructionQualityInspectionInput) {
  const admin = await requireConstructionAccess();
  const inspection = await constructionQualityService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return inspection;
}
export async function setQualityResultAction(id: string, projectId: string, result: QualityResult) {
  const admin = await requireConstructionAccess();
  await constructionQualityService.setResult(id, result, admin.id, admin.name);
  revalidateProject(projectId);
}
export async function createQualityIssueAction(inspectionId: string, projectId: string, input: ConstructionQualityIssueInput) {
  await requireConstructionAccess();
  const issue = await constructionQualityService.createIssue(inspectionId, input);
  revalidateProject(projectId);
  return issue;
}
export async function updateQualityIssueStatusAction(id: string, projectId: string, status: QualityIssueStatus) {
  const admin = await requireConstructionAccess();
  await constructionQualityService.updateIssueStatus(id, status, admin.id);
  revalidateProject(projectId);
}

// ---- Safety ----
export async function createSafetyRecordAction(projectId: string, input: ConstructionSafetyRecordInput) {
  const admin = await requireConstructionAccess();
  const record = await constructionSafetyService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return record;
}
export async function updateSafetyStatusAction(id: string, projectId: string, status: SafetyStatus) {
  await requireConstructionAccess();
  await constructionSafetyService.updateStatus(id, status);
  revalidateProject(projectId);
}

// ---- Delays ----
export async function createDelayAction(projectId: string, input: ConstructionDelayInput) {
  const admin = await requireConstructionAccess();
  const delay = await constructionDelayService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return delay;
}
export async function closeDelayAction(id: string, projectId: string, endDate: string) {
  await requireConstructionAccess();
  await constructionDelayService.close(id, endDate);
  revalidateProject(projectId);
}

// ---- Risks ----
export async function createRiskAction(projectId: string, input: ConstructionRiskInput) {
  const admin = await requireConstructionAccess();
  const risk = await constructionRiskService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return risk;
}
export async function updateRiskStatusAction(id: string, projectId: string, status: RiskStatus) {
  await requireConstructionAccess();
  await constructionRiskService.updateStatus(id, status);
  revalidateProject(projectId);
}

// ---- Handover ----
export async function advanceHandoverAction(projectId: string, status: HandoverStatus) {
  const admin = await requireConstructionAccess();
  const handover = await constructionHandoverService.advance(projectId, status, admin.id, admin.name);
  revalidateProject(projectId);
  return handover;
}
export async function customerVerifyHandoverAction(projectId: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  const project = await constructionProjectService.getById(projectId);
  if (!project || project.customerId !== customer.id) throw new Error("Not authorized.");
  await constructionHandoverService.recordCustomerVerification(projectId);
  revalidatePath("/customer/construction");
}

// ---- Snags ----
export async function createSnagAction(projectId: string, input: ConstructionSnagInput) {
  const admin = await requireConstructionAccess();
  const snag = await constructionSnagService.create(projectId, input, admin.id);
  revalidateProject(projectId);
  return snag;
}
export async function updateSnagStatusAction(id: string, projectId: string, status: SnagStatus) {
  await requireConstructionAccess();
  await constructionSnagService.updateStatus(id, status);
  revalidateProject(projectId);
}

// ---- Approvals ----
export async function recordApprovalAction(entityType: ApprovalEntityType, entityId: string, decision: ApprovalDecision, projectId: string, comments?: string) {
  const admin = await requireConstructionManageAccess();
  const approval = await constructionApprovalService.record(entityType, entityId, decision, admin.id, comments);
  revalidateProject(projectId);
  return approval;
}

// ---- Progress ----
export async function recordProgressUpdateAction(
  projectId: string,
  input: { updateType: ProgressUpdateType; referenceId?: string; plannedPercent?: number; actualPercent?: number; notes?: string; customerVisible?: boolean }
) {
  const admin = await requireConstructionAccess();
  const update = await constructionProgressService.recordUpdate(projectId, input, admin.id);
  revalidateProject(projectId);
  return update;
}

// ---- Settings ----
export async function updateConstructionSettingsAction(input: ConstructionSettingsInput) {
  await requireConstructionManageAccess();
  await constructionSettingsService.update(input);
  revalidatePath("/admin/construction/settings");
}

// ---- PDF generation ----
export async function generateBoqPdfAction(projectId: string) {
  const admin = await requireConstructionAccess();
  const doc = await constructionPdfService.generateBoqPdf(projectId, { adminId: admin.id, name: admin.name });
  revalidateProject(projectId);
  return doc;
}
export async function generateProgressReportPdfAction(projectId: string) {
  const admin = await requireConstructionAccess();
  const doc = await constructionPdfService.generateProgressReportPdf(projectId, { adminId: admin.id, name: admin.name });
  revalidateProject(projectId);
  return doc;
}
