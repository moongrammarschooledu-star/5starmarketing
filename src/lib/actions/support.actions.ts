"use server";

import { revalidatePath } from "next/cache";
import { ticketService } from "@/services/ticketService";
import { complaintService } from "@/services/complaintService";
import { escalationService } from "@/services/escalationService";
import { supportDepartmentService } from "@/services/supportDepartmentService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { supportSlaService } from "@/services/supportSlaService";
import { supportSettingsService } from "@/services/supportSettingsService";
import { kbService } from "@/services/kbService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { canAccess, canManageSupport } from "@/lib/permissions";
import type {
  SupportTicketInput,
  SupportTicketStatus,
  SupportTicketFeedbackInput,
  SupportDepartmentInput,
  SupportCategoryInput,
  SupportSlaRuleInput,
  SupportSettingsInput,
  SupportEscalationInput,
  ComplaintSeverity,
  ComplaintStatus,
  SupportKbArticleInput,
} from "@/lib/models/support";

async function requireSupportAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "support")) throw new Error("Not authorized.");
  return admin;
}

async function requireSupportManageAccess() {
  const admin = await requireSupportAccess();
  if (!canManageSupport(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

async function requireCustomer() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not authorized.");
  return customer;
}

function revalidateSupport(ticketId?: string) {
  revalidatePath("/admin/support");
  revalidatePath("/admin/support/dashboard");
  revalidatePath("/admin/support/tickets");
  revalidatePath("/admin/support/complaints");
  revalidatePath("/admin/support/escalations");
  revalidatePath("/admin/support/departments");
  revalidatePath("/admin/support/knowledge-base");
  revalidatePath("/customer/support");
  if (ticketId) {
    revalidatePath(`/admin/support/tickets/${ticketId}`);
    revalidatePath(`/customer/support/tickets/${ticketId}`);
  }
}

// ---- Tickets — admin/staff-side ----
export async function createTicketAsStaffAction(input: SupportTicketInput) {
  const admin = await requireSupportAccess();
  const ticket = await ticketService.create(input, { adminId: admin.id, adminName: admin.name });
  revalidateSupport();
  return ticket;
}

export async function assignTicketAction(ticketId: string, input: { departmentId?: string | null; assignedStaffId?: string | null }) {
  const admin = await requireSupportAccess();
  const ticket = await ticketService.assign(ticketId, input, admin.id, admin.name);
  revalidateSupport(ticketId);
  return ticket;
}

export async function updateTicketStatusAction(ticketId: string, status: SupportTicketStatus) {
  const admin = await requireSupportAccess();
  const ticket = await ticketService.updateStatus(ticketId, status, admin.id, admin.name);
  revalidateSupport(ticketId);
  return ticket;
}

export async function staffReplyAction(ticketId: string, body: string, isPrivateNote: boolean) {
  const admin = await requireSupportAccess();
  const message = await ticketService.staffReply(ticketId, body, isPrivateNote, { adminId: admin.id, name: admin.name });
  revalidateSupport(ticketId);
  return message;
}

export async function sweepSlaBreachesAction() {
  await requireSupportAccess();
  const result = await ticketService.sweepSlaBreaches();
  revalidateSupport();
  return result;
}

// ---- Tickets — customer-side ----
export async function createTicketAsCustomerAction(input: SupportTicketInput) {
  const customer = await requireCustomer();
  const ticket = await ticketService.create(input, { customerId: customer.id, customerName: customer.fullName });
  revalidateSupport();
  return ticket;
}

export async function customerReplyAction(ticketId: string, body: string) {
  const customer = await requireCustomer();
  const message = await ticketService.customerReply(ticketId, customer.id, customer.fullName, body);
  revalidateSupport(ticketId);
  return message;
}

export async function requestReopenAction(ticketId: string) {
  const customer = await requireCustomer();
  const ticket = await ticketService.requestReopen(ticketId, customer.id, customer.fullName);
  revalidateSupport(ticketId);
  return ticket;
}

export async function submitTicketFeedbackAction(ticketId: string, input: SupportTicketFeedbackInput) {
  const customer = await requireCustomer();
  await ticketService.submitFeedback(ticketId, customer.id, input);
  revalidateSupport(ticketId);
}

// ---- Complaints ----
export async function fileComplaintAsCustomerAction(ticketInput: Omit<SupportTicketInput, "categoryCode">, severity?: ComplaintSeverity) {
  const customer = await requireCustomer();
  const complaint = await complaintService.fileNew(ticketInput, severity, { customerId: customer.id, customerName: customer.fullName });
  revalidateSupport();
  return complaint;
}

export async function fileComplaintAsStaffAction(ticketInput: Omit<SupportTicketInput, "categoryCode">, severity?: ComplaintSeverity) {
  const admin = await requireSupportAccess();
  const complaint = await complaintService.fileNew(ticketInput, severity, { adminId: admin.id, adminName: admin.name });
  revalidateSupport();
  return complaint;
}

export async function attachComplaintToTicketAction(ticketId: string, severity?: ComplaintSeverity) {
  const admin = await requireSupportAccess();
  const complaint = await complaintService.attachToTicket(ticketId, severity, admin.id);
  revalidateSupport(ticketId);
  return complaint;
}

export async function assignComplaintOfficerAction(complaintId: string, officerId: string | null) {
  const admin = await requireSupportManageAccess();
  await complaintService.assignOfficer(complaintId, officerId, admin.id, admin.name);
  revalidateSupport();
}

export async function updateComplaintStatusAction(complaintId: string, status: ComplaintStatus, fields?: { resolution?: string; customerResponse?: string; closureReason?: string }) {
  const admin = await requireSupportAccess();
  const complaint = await complaintService.updateStatus(complaintId, status, admin.id, admin.name, fields);
  revalidateSupport();
  return complaint;
}

// ---- Escalations ----
export async function escalateTicketAction(input: SupportEscalationInput) {
  const admin = await requireSupportAccess();
  const escalation = await escalationService.escalate(input, admin.id, admin.name);
  revalidateSupport(input.ticketId);
  return escalation;
}

// ---- Departments ----
export async function createDepartmentAction(input: SupportDepartmentInput) {
  const admin = await requireSupportManageAccess();
  const department = await supportDepartmentService.create(input, admin.id);
  revalidateSupport();
  return department;
}

export async function updateDepartmentAction(id: string, input: Partial<Omit<SupportDepartmentInput, "code">>) {
  await requireSupportManageAccess();
  await supportDepartmentService.update(id, input);
  revalidateSupport();
}

export async function addDepartmentStaffAction(departmentId: string, adminId: string) {
  const admin = await requireSupportManageAccess();
  await supportDepartmentService.addStaff(departmentId, adminId, admin.id);
  revalidateSupport();
}

export async function removeDepartmentStaffAction(departmentId: string, adminId: string) {
  const admin = await requireSupportManageAccess();
  await supportDepartmentService.removeStaff(departmentId, adminId, admin.id);
  revalidateSupport();
}

// ---- Categories ----
export async function createCategoryAction(input: SupportCategoryInput) {
  await requireSupportManageAccess();
  const category = await supportCategoryService.create(input);
  revalidateSupport();
  return category;
}

export async function updateCategoryAction(code: string, input: Partial<Omit<SupportCategoryInput, "code">>) {
  await requireSupportManageAccess();
  await supportCategoryService.update(code, input);
  revalidateSupport();
}

// ---- SLA rules ----
export async function createSlaRuleAction(input: SupportSlaRuleInput) {
  await requireSupportManageAccess();
  const rule = await supportSlaService.create(input);
  revalidateSupport();
  return rule;
}

export async function updateSlaRuleAction(id: string, input: Partial<SupportSlaRuleInput> & { active?: boolean }) {
  await requireSupportManageAccess();
  await supportSlaService.update(id, input);
  revalidateSupport();
}

// ---- Settings ----
export async function updateSupportSettingsAction(input: SupportSettingsInput) {
  await requireSupportManageAccess();
  await supportSettingsService.update(input);
  revalidateSupport();
}

// ---- Knowledge base ----
export async function createKbArticleAction(input: SupportKbArticleInput) {
  const admin = await requireSupportManageAccess();
  const article = await kbService.create(input, admin.id);
  revalidateSupport();
  return article;
}

export async function updateKbArticleAction(id: string, input: Partial<SupportKbArticleInput>) {
  await requireSupportManageAccess();
  await kbService.update(id, input);
  revalidateSupport();
}

export async function createKbArticleFromTicketAction(ticketId: string, title: string, question: string, answer: string, categoryCode?: string) {
  const admin = await requireSupportManageAccess();
  const article = await kbService.createFromTicket(title, question, answer, categoryCode, admin.id);
  revalidatePath(`/admin/support/tickets/${ticketId}`);
  revalidateSupport();
  return article;
}

export async function recordKbFeedbackAction(articleId: string, helpful: boolean) {
  const customer = await customerService.getCurrentCustomer();
  await kbService.recordFeedback(articleId, helpful, customer?.id);
  revalidatePath("/customer/support/faq");
  revalidatePath("/support/faq");
}
