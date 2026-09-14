"use server";

import { revalidatePath } from "next/cache";
import { landlordService } from "@/services/landlordService";
import { tenantService } from "@/services/tenantService";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { rentalApplicationService } from "@/services/rentalApplicationService";
import { leaseService } from "@/services/leaseService";
import { rentScheduleService } from "@/services/rentScheduleService";
import { rentPaymentService } from "@/services/rentPaymentService";
import { depositService } from "@/services/depositService";
import { rentalNoticeService } from "@/services/rentalNoticeService";
import { leaseRenewalService } from "@/services/leaseRenewalService";
import { moveRecordService } from "@/services/moveRecordService";
import { landlordStatementService } from "@/services/landlordStatementService";
import { rentalSettingsService } from "@/services/rentalSettingsService";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { inventoryService } from "@/services/inventoryService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { canAccess, canManageRentals } from "@/lib/permissions";
import type {
  LandlordInput,
  LandlordStatus,
  TenantInput,
  TenantStatus,
  RentalPropertyInput,
  RentalStatus,
  RentalApplicationInput,
  RentalApplicationStatus,
  LeaseInput,
  LeaseStatus,
  RentScheduleAdjustmentInput,
  RentPaymentInput,
  DepositTransactionInput,
  RentalNoticeInput,
  NoticeStatus,
  LeaseRenewalInput,
  RenewalStatus,
  LandlordStatementGenerateInput,
  RentalSettingsInput,
} from "@/lib/models/rental";

async function requireRentalsAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) throw new Error("Not authorized.");
  return admin;
}

async function requireRentalsManageAccess() {
  const admin = await requireRentalsAccess();
  if (!canManageRentals(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateRentals() {
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/rentals/dashboard");
  revalidatePath("/admin/rentals/properties");
  revalidatePath("/admin/rentals/tenants");
  revalidatePath("/admin/rentals/landlords");
  revalidatePath("/admin/rentals/leases");
  revalidatePath("/admin/rentals/rent");
  revalidatePath("/admin/rentals/payments");
  revalidatePath("/admin/rentals/deposits");
  revalidatePath("/admin/rentals/expenses");
  revalidatePath("/admin/rentals/maintenance");
  revalidatePath("/admin/rentals/notices");
  revalidatePath("/customer/rentals");
  revalidatePath("/customer/landlord");
}

// ---- Landlords ----
export async function createLandlordAction(input: LandlordInput) {
  const admin = await requireRentalsManageAccess();
  const landlord = await landlordService.create(input, admin.id, admin.name);
  revalidateRentals();
  return landlord;
}
export async function updateLandlordAction(id: string, input: Partial<LandlordInput>) {
  await requireRentalsManageAccess();
  await landlordService.update(id, input);
  revalidateRentals();
}
export async function setLandlordStatusAction(id: string, status: LandlordStatus) {
  const admin = await requireRentalsManageAccess();
  await landlordService.setStatus(id, status, admin.id, admin.name);
  revalidateRentals();
}

// ---- Tenants ----
export async function createTenantAction(input: TenantInput) {
  const admin = await requireRentalsAccess();
  const tenant = await tenantService.create(input, admin.id, admin.name);
  revalidateRentals();
  return tenant;
}
export async function updateTenantAction(id: string, input: Partial<TenantInput>) {
  await requireRentalsAccess();
  await tenantService.update(id, input);
  revalidateRentals();
}
export async function setTenantStatusAction(id: string, status: TenantStatus) {
  const admin = await requireRentalsAccess();
  await tenantService.setStatus(id, status, admin.id, admin.name);
  revalidateRentals();
}

// ---- Rental properties ----
export async function listUnitsForPropertyAction(propertyId: string) {
  await requireRentalsAccess();
  const units = await inventoryService.searchAll({ propertyId });
  return units.map((u) => ({ id: u.id, unitNumber: u.unitNumber }));
}
export async function createRentalPropertyAction(input: RentalPropertyInput) {
  const admin = await requireRentalsAccess();
  const rentalProperty = await rentalPropertyService.create(input, admin.id, admin.name);
  revalidateRentals();
  return rentalProperty;
}
export async function updateRentalPropertyAction(id: string, input: Partial<RentalPropertyInput>) {
  await requireRentalsAccess();
  await rentalPropertyService.update(id, input);
  revalidateRentals();
}
export async function setRentalStatusAction(id: string, status: RentalStatus) {
  const admin = await requireRentalsAccess();
  await rentalPropertyService.setRentalStatus(id, status, admin.id, admin.name);
  revalidateRentals();
}

// ---- Rental applications ----
export async function createRentalApplicationAction(input: RentalApplicationInput) {
  const customer = await customerService.getCurrentCustomer();
  const application = await rentalApplicationService.create(input, customer?.id);
  revalidateRentals();
  return application;
}
export async function updateRentalApplicationStatusAction(id: string, status: RentalApplicationStatus) {
  const admin = await requireRentalsAccess();
  await rentalApplicationService.updateStatus(id, status, admin.id, admin.name);
  revalidateRentals();
}
export async function withdrawRentalApplicationAction(id: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  await rentalApplicationService.withdraw(id, customer.id);
  revalidateRentals();
}

// ---- Leases ----
export async function createLeaseAction(input: LeaseInput) {
  const admin = await requireRentalsManageAccess();
  const lease = await leaseService.create(input, admin.id, admin.name);
  revalidateRentals();
  return lease;
}
export async function updateLeaseAction(id: string, input: Parameters<typeof leaseService.update>[1]) {
  await requireRentalsManageAccess();
  await leaseService.update(id, input);
  revalidateRentals();
}
export async function updateLeaseStatusAction(id: string, status: LeaseStatus, reason?: string) {
  const admin = await requireRentalsManageAccess();
  const lease = await leaseService.updateStatus(id, status, admin.id, admin.name, reason);
  revalidateRentals();
  return lease;
}

// ---- Rent schedules ----
export async function generateRentScheduleAction(leaseId: string, numberOfPeriods?: number) {
  await requireRentalsManageAccess();
  const schedules = await rentScheduleService.generate(leaseId, numberOfPeriods);
  revalidateRentals();
  return schedules;
}
export async function adjustRentScheduleAction(id: string, input: RentScheduleAdjustmentInput) {
  await requireRentalsManageAccess();
  await rentScheduleService.adjust(id, input);
  revalidateRentals();
}
export async function applyLateFeeAction(id: string) {
  await requireRentalsManageAccess();
  await rentScheduleService.applyLateFee(id);
  revalidateRentals();
}
export async function waiveRentScheduleAction(id: string, notes?: string) {
  await requireRentalsManageAccess();
  await rentScheduleService.waive(id, notes);
  revalidateRentals();
}
export async function cancelRentScheduleAction(id: string) {
  await requireRentalsManageAccess();
  await rentScheduleService.cancel(id);
  revalidateRentals();
}

// ---- Rent payments ----
export async function createRentPaymentAction(input: RentPaymentInput) {
  const admin = await requireRentalsAccess();
  const payment = await rentPaymentService.create(input, admin.id);
  revalidateRentals();
  return payment;
}
export async function confirmRentPaymentAction(id: string) {
  const admin = await requireRentalsManageAccess();
  const payment = await rentPaymentService.confirm(id, admin.id, admin.name);
  revalidateRentals();
  revalidatePath("/admin/accounting");
  return payment;
}
export async function markRentPaymentFailedAction(id: string) {
  const admin = await requireRentalsAccess();
  await rentPaymentService.markFailed(id, admin.id, admin.name);
  revalidateRentals();
}
export async function reverseRentPaymentAction(id: string, reason: string) {
  const admin = await requireRentalsManageAccess();
  await rentPaymentService.reverse(id, reason, admin.id, admin.name);
  revalidateRentals();
}
export async function refundRentPaymentAction(id: string, reason: string) {
  const admin = await requireRentalsManageAccess();
  await rentPaymentService.refund(id, reason, admin.id, admin.name);
  revalidateRentals();
}

// ---- Security deposits ----
export async function markDepositReceivedAction(id: string, receivedDate: string) {
  const admin = await requireRentalsManageAccess();
  await depositService.markReceived(id, receivedDate, admin.id, admin.name);
  revalidateRentals();
}
export async function recordDepositTransactionAction(depositId: string, input: DepositTransactionInput) {
  const admin = await requireRentalsManageAccess();
  const transaction = await depositService.recordTransaction(depositId, input, admin.id, admin.name);
  revalidateRentals();
  return transaction;
}

// ---- Rental notices ----
export async function createRentalNoticeAction(input: RentalNoticeInput) {
  const admin = await requireRentalsAccess();
  let recipientCustomerId = input.recipientCustomerId;
  if (!recipientCustomerId && input.leaseId) {
    const lease = await leaseService.getById(input.leaseId);
    if (lease) {
      if (input.recipientType === "TENANT") {
        const tenant = await tenantService.getById(lease.tenantId);
        recipientCustomerId = tenant?.customerId;
      } else {
        const landlord = await landlordService.getById(lease.landlordId);
        recipientCustomerId = landlord?.customerId;
      }
    }
  }
  const notice = await rentalNoticeService.create({ ...input, recipientCustomerId }, admin.id, admin.name);
  revalidateRentals();
  return notice;
}
export async function setRentalNoticeStatusAction(id: string, status: NoticeStatus) {
  await requireRentalsAccess();
  await rentalNoticeService.setStatus(id, status);
  revalidateRentals();
}
export async function acknowledgeRentalNoticeAction(id: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  await rentalNoticeService.acknowledge(id, customer.id);
  revalidatePath("/customer/rentals");
  revalidatePath("/customer/landlord");
}

// ---- Lease renewals ----
export async function requestLeaseRenewalAction(leaseId: string, input: LeaseRenewalInput) {
  const admin = await profileService.getCurrentAdmin();
  const customer = admin ? null : await customerService.getCurrentCustomer();
  if (!admin && !customer) throw new Error("Not authorized.");
  const renewal = await leaseRenewalService.request(leaseId, input, { adminId: admin?.id, adminName: admin?.name, customerId: customer?.id });
  revalidateRentals();
  return renewal;
}
export async function updateLeaseRenewalStatusAction(id: string, status: RenewalStatus) {
  const admin = await requireRentalsManageAccess();
  const renewal = await leaseRenewalService.updateStatus(id, status, admin.id, admin.name);
  revalidateRentals();
  return renewal;
}

// ---- Move records ----
export async function ensureMoveRecordAction(leaseId: string, recordType: "MOVE_IN" | "MOVE_OUT") {
  const admin = await requireRentalsAccess();
  const record = await moveRecordService.ensureForLease(leaseId, recordType, admin.id);
  revalidateRentals();
  return record;
}
export async function updateMoveRecordStepAction(id: string, input: Parameters<typeof moveRecordService.updateStep>[1]) {
  const admin = await requireRentalsAccess();
  await moveRecordService.updateStep(id, input, admin.id, admin.name);
  revalidateRentals();
}
export async function confirmMoveRecordByTenantAction(id: string) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  await moveRecordService.confirmByTenant(id, customer.id);
  revalidatePath("/customer/rentals");
}
export async function completeMoveRecordAction(id: string) {
  const admin = await requireRentalsAccess();
  await moveRecordService.complete(id, admin.id, admin.name);
  revalidateRentals();
}

// ---- Landlord statements ----
export async function generateLandlordStatementAction(input: LandlordStatementGenerateInput) {
  const admin = await requireRentalsManageAccess();
  const statement = await landlordStatementService.generate(input, admin.id);
  revalidateRentals();
  return statement;
}
export async function finalizeLandlordStatementAction(id: string) {
  const admin = await requireRentalsManageAccess();
  await landlordStatementService.finalize(id, admin.id, admin.name);
  revalidateRentals();
}

// ---- Rental maintenance (landlord approval, section 27) ----
export async function requireWorkOrderLandlordApprovalAction(workOrderId: string) {
  const admin = await requireRentalsAccess();
  await maintenanceWorkOrderService.requireLandlordApproval(workOrderId, admin.id, admin.name);
  revalidateRentals();
  revalidatePath("/admin/maintenance");
}
export async function recordWorkOrderLandlordApprovalAction(workOrderId: string, decision: "APPROVED" | "REJECTED") {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Please sign in.");
  await maintenanceWorkOrderService.recordLandlordApproval(workOrderId, decision, customer.id);
  revalidatePath("/customer/landlord");
}

// ---- Settings ----
export async function updateRentalSettingsAction(input: RentalSettingsInput) {
  await requireRentalsManageAccess();
  await rentalSettingsService.update(input);
  revalidatePath("/admin/rentals/settings");
}
