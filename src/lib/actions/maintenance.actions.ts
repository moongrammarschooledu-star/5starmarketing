"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { maintenanceAssetService } from "@/services/maintenanceAssetService";
import { inspectionTemplateService } from "@/services/inspectionTemplateService";
import { propertyInspectionService } from "@/services/propertyInspectionService";
import { propertyDefectService } from "@/services/propertyDefectService";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { maintenanceScheduleService } from "@/services/maintenanceScheduleService";
import { maintenanceSettingsService } from "@/services/maintenanceSettingsService";
import { maintenanceSlaService } from "@/services/maintenanceSlaService";
import { inspectionReportPdfService } from "@/services/inspectionReportPdfService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { leadService } from "@/services/leadService";
import { canAccess, canManageMaintenance } from "@/lib/permissions";
import { isRateLimited } from "@/lib/rateLimit";
import type {
  MaintenanceVendorInput,
  MaintenanceAssetInput,
  AssetWarrantyInput,
  InspectionTemplateInput,
  InspectionChecklistItemDefInput,
  PropertyInspectionInput,
  InspectionResultInput,
  InspectionStatus,
  PropertyDefectInput,
  DefectStatus,
  MaintenanceRequestInput,
  MaintenanceRequestStatus,
  MaintenanceWorkOrderInput,
  WorkOrderStatus,
  MaintenanceWorkOrderItemInput,
  MaintenanceScheduleInput,
  MaintenanceSettingsInput,
  MaintenanceSlaSettingInput,
  MaintenancePriority,
  PhotoType,
  VendorStatus,
  ConditionRating,
} from "@/lib/models/maintenance";

async function requireMaintenanceAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "maintenance")) throw new Error("Not authorized.");
  return admin;
}

async function requireMaintenanceManageAccess() {
  const admin = await requireMaintenanceAccess();
  if (!canManageMaintenance(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateAll(propertyId?: string) {
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin/maintenance/dashboard");
  revalidatePath("/admin/maintenance/requests");
  revalidatePath("/admin/maintenance/work-orders");
  revalidatePath("/admin/maintenance/schedules");
  revalidatePath("/admin/maintenance/vendors");
  revalidatePath("/admin/maintenance/assets");
  revalidatePath("/admin/maintenance/inspections");
  revalidatePath("/admin/inspections");
  revalidatePath("/customer/maintenance");
  if (propertyId) {
    revalidatePath(`/properties/${propertyId}/maintenance`);
    revalidatePath(`/properties/${propertyId}/inspection`);
  }
}

// ---- Vendors ----
export async function createVendorAction(input: MaintenanceVendorInput) {
  const admin = await requireMaintenanceManageAccess();
  const vendor = await maintenanceVendorService.create(input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/vendors");
  return vendor;
}
export async function updateVendorAction(id: string, input: Partial<MaintenanceVendorInput>) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceVendorService.update(id, input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/vendors");
}
export async function setVendorStatusAction(id: string, status: VendorStatus) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceVendorService.setStatus(id, status, admin.id, admin.name);
  revalidatePath("/admin/maintenance/vendors");
}

// ---- Assets ----
export async function createAssetAction(input: MaintenanceAssetInput) {
  const admin = await requireMaintenanceManageAccess();
  const asset = await maintenanceAssetService.create(input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/assets");
  return asset;
}
export async function updateAssetAction(id: string, input: Partial<MaintenanceAssetInput>) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceAssetService.update(id, input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/assets");
}
export async function addAssetWarrantyAction(assetId: string, input: AssetWarrantyInput) {
  const admin = await requireMaintenanceManageAccess();
  const warranty = await maintenanceAssetService.addWarranty(assetId, input, admin.id);
  revalidatePath("/admin/maintenance/assets");
  return warranty;
}

// ---- Inspection templates ----
export async function createTemplateAction(input: InspectionTemplateInput) {
  const admin = await requireMaintenanceManageAccess();
  const template = await inspectionTemplateService.create(input, admin.id);
  revalidatePath("/admin/maintenance/settings");
  return template;
}
export async function addTemplateItemAction(templateId: string, input: InspectionChecklistItemDefInput) {
  await requireMaintenanceManageAccess();
  const item = await inspectionTemplateService.addItem(templateId, input);
  revalidatePath("/admin/maintenance/settings");
  return item;
}
export async function removeTemplateItemAction(id: string) {
  await requireMaintenanceManageAccess();
  await inspectionTemplateService.removeItem(id);
  revalidatePath("/admin/maintenance/settings");
}

// ---- Inspections ----
export async function createInspectionAction(input: PropertyInspectionInput) {
  const admin = await requireMaintenanceAccess();
  const inspection = await propertyInspectionService.create(input, admin.id);
  revalidateAll(input.propertyId);
  return inspection;
}
export async function updateInspectionStatusAction(id: string, status: InspectionStatus) {
  const admin = await requireMaintenanceAccess();
  const inspection = await propertyInspectionService.updateStatus(id, status, admin.id, admin.name);
  revalidateAll(inspection.propertyId);
  return inspection;
}
export async function updateInspectionDetailsAction(id: string, input: { overallCondition?: ConditionRating; notes?: string; recommendations?: string }) {
  const admin = await requireMaintenanceAccess();
  await propertyInspectionService.updateDetails(id, input, admin.id);
  revalidatePath("/admin/inspections");
}
export async function updateInspectionResultAction(resultId: string, input: InspectionResultInput) {
  await requireMaintenanceAccess();
  const result = await propertyInspectionService.updateResult(resultId, input);
  revalidatePath("/admin/inspections");
  return result;
}
export async function uploadInspectionPhotoAction(input: { inspectionId: string; propertyId: string; dataUri: string; caption?: string; checklistResultId?: string; defectId?: string }) {
  const admin = await requireMaintenanceAccess();
  const photo = await propertyInspectionService.uploadPhoto(input, admin.id);
  revalidatePath("/admin/inspections");
  return photo;
}
export async function removeInspectionPhotoAction(photoId: string) {
  await requireMaintenanceAccess();
  await propertyInspectionService.removePhoto(photoId);
  revalidatePath("/admin/inspections");
}
export async function getInspectionPhotoUrlAction(photoId: string) {
  await requireMaintenanceAccess();
  return propertyInspectionService.getPhotoSignedUrl(photoId);
}

export async function generateInspectionReportAction(inspectionId: string) {
  const admin = await requireMaintenanceAccess();
  const document = await inspectionReportPdfService.generate(inspectionId, { adminId: admin.id, name: admin.name });
  revalidatePath("/admin/inspections");
  return document;
}

// ---- Defects ----
export async function createDefectAction(input: PropertyDefectInput) {
  const admin = await requireMaintenanceAccess();
  const defect = await propertyDefectService.create(input, admin.id, admin.name);
  revalidateAll(input.propertyId);
  return defect;
}
export async function updateDefectStatusAction(id: string, status: DefectStatus) {
  const admin = await requireMaintenanceAccess();
  const defect = await propertyDefectService.updateStatus(id, status, admin.id, admin.name);
  revalidateAll(defect.propertyId);
  return defect;
}

// ---- Maintenance requests ----
export async function createMaintenanceRequestAdminAction(input: MaintenanceRequestInput) {
  const admin = await requireMaintenanceAccess();
  const request = await maintenanceRequestService.create(input, { adminId: admin.id });
  revalidateAll(input.propertyId);
  return request;
}

export async function createMaintenanceRequestCustomerAction(input: MaintenanceRequestInput) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in to submit a maintenance request.");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`maintenance-request:${ip}`, 60_000, 5)) throw new Error("Too many requests. Please try again in a minute.");
  const request = await maintenanceRequestService.create(input, { customerId: customer.id });
  revalidatePath("/customer/maintenance");
  return request;
}

export async function updateMaintenanceRequestStatusAction(id: string, status: MaintenanceRequestStatus, reason?: string) {
  const admin = await requireMaintenanceAccess();
  const request = await maintenanceRequestService.updateStatus(id, status, { adminId: admin.id, name: admin.name }, reason);
  revalidateAll(request.propertyId);
  return request;
}

export async function customerRespondToCompletionAction(id: string, input: { confirmed: boolean; feedback?: string; rating?: number }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  const request = await maintenanceRequestService.customerRespond(id, customer.id, input);
  revalidatePath("/customer/maintenance");
  revalidateAll(request.propertyId);
  return request;
}

export async function addMaintenanceCommentAction(requestId: string, body: string, internalOnly = false) {
  const admin = await profileService.getCurrentAdmin();
  const customer = admin ? null : await customerService.getCurrentCustomer();
  if (!admin && !customer) throw new Error("Not authorized.");
  const comment = await maintenanceRequestService.addComment(
    requestId,
    body,
    admin ? { adminId: admin.id, name: admin.name } : { customerId: customer!.id, name: customer!.fullName || "Customer" },
    admin ? internalOnly : false
  );
  revalidatePath("/customer/maintenance");
  revalidatePath("/admin/maintenance/requests");
  return comment;
}

export async function uploadMaintenanceRequestPhotoAdminAction(requestId: string, dataUri: string, caption?: string) {
  const admin = await requireMaintenanceAccess();
  const photo = await maintenanceRequestService.uploadPhoto(requestId, dataUri, caption, { adminId: admin.id });
  revalidatePath("/admin/maintenance/requests");
  return photo;
}

export async function uploadMaintenanceRequestPhotoCustomerAction(requestId: string, dataUri: string, caption?: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  const photo = await maintenanceRequestService.uploadPhoto(requestId, dataUri, caption, { customerId: customer.id });
  revalidatePath("/customer/maintenance");
  return photo;
}

export async function getCustomerWorkOrdersForRequestAction(requestId: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  const request = await maintenanceRequestService.getById(requestId);
  if (!request || request.customerId !== customer.id) throw new Error("Request not found.");
  return maintenanceWorkOrderService.listCustomerViewByRequest(requestId);
}

export async function getMaintenancePhotoUrlAction(photoId: string) {
  const admin = await profileService.getCurrentAdmin();
  const customer = admin ? null : await customerService.getCurrentCustomer();
  if (!admin && !customer) throw new Error("Not authorized.");
  return maintenanceRequestService.getPhotoSignedUrl(photoId);
}

// ---- Work orders ----
export async function createWorkOrderAction(input: MaintenanceWorkOrderInput) {
  const admin = await requireMaintenanceAccess();
  const workOrder = await maintenanceWorkOrderService.create(input, admin.id, admin.name);
  revalidateAll(input.propertyId);
  return workOrder;
}
export async function updateWorkOrderStatusAction(id: string, status: WorkOrderStatus) {
  const admin = await requireMaintenanceAccess();
  const workOrder = await maintenanceWorkOrderService.updateStatus(id, status, { adminId: admin.id, name: admin.name });
  revalidateAll(workOrder.propertyId);
  return workOrder;
}
export async function updateWorkOrderCostsAction(id: string, input: { estimatedCost?: number; approvedCost?: number; actualCost?: number; customerCharge?: number; internalCost?: number }) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceWorkOrderService.updateCosts(id, input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/work-orders");
}
export async function assignWorkOrderAction(id: string, input: { vendorId?: string; technicianId?: string }) {
  const admin = await requireMaintenanceAccess();
  await maintenanceWorkOrderService.assign(id, input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/work-orders");
}
export async function addWorkOrderItemAction(workOrderId: string, input: MaintenanceWorkOrderItemInput) {
  await requireMaintenanceAccess();
  const item = await maintenanceWorkOrderService.addItem(workOrderId, input);
  revalidatePath("/admin/maintenance/work-orders");
  return item;
}
export async function removeWorkOrderItemAction(itemId: string, workOrderId: string) {
  await requireMaintenanceAccess();
  await maintenanceWorkOrderService.removeItem(itemId, workOrderId);
  revalidatePath("/admin/maintenance/work-orders");
}
export async function logWorkOrderAsExpenseAction(workOrderId: string) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceWorkOrderService.logAsExpense(workOrderId, admin.id, admin.name);
  revalidatePath("/admin/maintenance/work-orders");
  revalidatePath("/admin/accounting/expenses");
}
export async function uploadWorkOrderPhotoAction(workOrderId: string, photoType: PhotoType, dataUri: string, caption?: string) {
  const admin = await requireMaintenanceAccess();
  const photo = await maintenanceWorkOrderService.uploadPhoto(workOrderId, photoType, dataUri, caption, admin.id);
  revalidatePath("/admin/maintenance/work-orders");
  return photo;
}

// ---- Preventive maintenance schedules ----
export async function createScheduleAction(input: MaintenanceScheduleInput) {
  const admin = await requireMaintenanceManageAccess();
  const schedule = await maintenanceScheduleService.create(input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/schedules");
  return schedule;
}
export async function updateScheduleAction(id: string, input: Partial<MaintenanceScheduleInput> & { active?: boolean }) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceScheduleService.update(id, input, admin.id, admin.name);
  revalidatePath("/admin/maintenance/schedules");
}
export async function markScheduleCompletedAction(id: string) {
  const admin = await requireMaintenanceManageAccess();
  const schedule = await maintenanceScheduleService.markCompleted(id, admin.id, admin.name);
  revalidatePath("/admin/maintenance/schedules");
  return schedule;
}
export async function removeScheduleAction(id: string) {
  const admin = await requireMaintenanceManageAccess();
  await maintenanceScheduleService.remove(id, admin.id, admin.name);
  revalidatePath("/admin/maintenance/schedules");
}

// ---- Settings ----
export async function updateMaintenanceSettingsAction(input: MaintenanceSettingsInput) {
  await requireMaintenanceManageAccess();
  await maintenanceSettingsService.update(input);
  revalidatePath("/admin/maintenance/settings");
}
export async function updateSlaSettingAction(priority: MaintenancePriority, input: MaintenanceSlaSettingInput) {
  await requireMaintenanceManageAccess();
  await maintenanceSlaService.update(priority, input);
  revalidatePath("/admin/maintenance/settings");
}

// ---- CRM integration (section 36) — public inquiry, mirrors STEP 24's
// createInvestmentLeadAction hardening exactly. ----
export async function createMaintenanceInquiryLeadAction(input: {
  name: string;
  phone: string;
  email?: string;
  propertyId?: string;
  message?: string;
  consent: boolean;
  company?: string;
}) {
  if (input.company?.trim()) return; // honeypot — silently accept, never save
  if (!input.name.trim() || !input.phone.trim()) throw new Error("Please provide your name and phone number.");
  if (!/^[0-9+()\-\s]{7,20}$/.test(input.phone.trim())) throw new Error("Please enter a valid phone number.");
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Please enter a valid email address.");
  if (!input.consent) throw new Error("Please agree to be contacted regarding this inquiry.");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`maintenance-lead:${ip}`, 60_000, 5)) throw new Error("Too many submissions. Please try again in a minute.");

  await leadService.create({
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email,
    propertyId: input.propertyId,
    message: input.message || "Maintenance/property condition consultation request",
    source: "Property Page",
    leadType: "General Inquiry",
    consent: input.consent,
  });
}
