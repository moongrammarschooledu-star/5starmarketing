"use server";

import { revalidatePath } from "next/cache";
import { accountService } from "@/services/accountService";
import { financialTransactionService } from "@/services/financialTransactionService";
import { expenseService } from "@/services/expenseService";
import { payableService } from "@/services/payableService";
import { commissionRuleService } from "@/services/commissionRuleService";
import { agentCommissionService } from "@/services/agentCommissionService";
import { financialAdjustmentService } from "@/services/financialAdjustmentService";
import { reconciliationService } from "@/services/reconciliationService";
import { accountingSettingsService } from "@/services/accountingSettingsService";
import { dealService } from "@/services/dealService";
import { communicationService } from "@/services/communicationService";
import { profileService } from "@/services/profileService";
import { formatPKR } from "@/lib/calculator";
import { canAccess, canManageFinance, canSubmitExpense } from "@/lib/permissions";
import type { AccountInput, ExpenseInput, PayableInput, CommissionRuleInput, FinancialAdjustmentInput, AccountingSettingsInput, ReconciliationStatus, FinancialTransactionInput } from "@/lib/models/accounting";

async function requireAccountingAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "accounting")) throw new Error("Not authorized.");
  return admin;
}

async function requireFinanceAccess() {
  const admin = await requireAccountingAccess();
  if (!canManageFinance(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

async function requireExpenseSubmitAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canSubmitExpense(admin.role)) throw new Error("Not authorized.");
  return admin;
}

function revalidateAll() {
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/accounting/dashboard");
  revalidatePath("/admin/accounting/income");
  revalidatePath("/admin/accounting/expenses");
  revalidatePath("/admin/accounting/receivables");
  revalidatePath("/admin/accounting/payables");
  revalidatePath("/admin/accounting/commissions");
  revalidatePath("/admin/accounting/transactions");
  revalidatePath("/admin/accounting/accounts");
  revalidatePath("/admin/accounting/reports");
  revalidatePath("/admin/accounting/profit-loss");
  revalidatePath("/admin/accounting/cash-flow");
  revalidatePath("/admin/accounting/reconciliation");
}

// ---- Accounts (chart of accounts / categories) ----

export async function createAccountAction(input: AccountInput) {
  await requireFinanceAccess();
  const account = await accountService.create(input);
  revalidatePath("/admin/accounting/accounts");
  revalidatePath("/admin/accounting/expenses");
  return account;
}

export async function updateAccountAction(id: string, input: Partial<AccountInput>) {
  await requireFinanceAccess();
  await accountService.update(id, input);
  revalidatePath("/admin/accounting/accounts");
}

export async function setAccountActiveAction(id: string, isActive: boolean) {
  await requireFinanceAccess();
  await accountService.setActive(id, isActive);
  revalidatePath("/admin/accounting/accounts");
}

// ---- Transactions ----

export async function createTransactionAction(input: FinancialTransactionInput) {
  const admin = await requireFinanceAccess();
  const transaction = await financialTransactionService.create(input, admin.id);
  revalidateAll();
  return transaction;
}

export async function confirmTransactionAction(id: string) {
  const admin = await requireFinanceAccess();
  await financialTransactionService.confirm(id, admin.id);
  revalidateAll();
}

export async function cancelTransactionAction(id: string) {
  const admin = await requireFinanceAccess();
  await financialTransactionService.cancel(id, admin.id);
  revalidateAll();
}

export async function reverseTransactionAction(id: string, reason: string) {
  const admin = await requireFinanceAccess();
  const reversal = await financialTransactionService.reverse(id, reason, admin.id, admin.name);
  revalidateAll();
  return reversal;
}

// ---- Expenses ----

export async function createExpenseAction(input: ExpenseInput, saveDraft: boolean) {
  const admin = await requireExpenseSubmitAccess();
  const expense = await expenseService.create(input, admin.id, admin.name, saveDraft);
  revalidatePath("/admin/accounting/expenses");
  return expense;
}

export async function submitExpenseAction(id: string) {
  const admin = await requireExpenseSubmitAccess();
  await expenseService.submit(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/expenses");
}

export async function markExpenseUnderReviewAction(id: string) {
  const admin = await requireFinanceAccess();
  await expenseService.markUnderReview(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/expenses");
}

export async function approveExpenseAction(id: string) {
  const admin = await requireFinanceAccess();
  await expenseService.approve(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/expenses");
}

export async function rejectExpenseAction(id: string, reason: string) {
  const admin = await requireFinanceAccess();
  await expenseService.reject(id, reason, admin.id, admin.name);
  revalidatePath("/admin/accounting/expenses");
}

export async function markExpensePaidAction(id: string) {
  const admin = await requireFinanceAccess();
  const expense = await expenseService.markPaid(id, admin.id, admin.name);
  revalidateAll();
  return expense;
}

export async function uploadExpenseAttachmentAction(expenseId: string, fileName: string, dataUri: string) {
  await requireExpenseSubmitAccess();
  const attachment = await expenseService.uploadAttachment(expenseId, fileName, dataUri);
  revalidatePath("/admin/accounting/expenses");
  return attachment;
}

export async function getExpenseAttachmentSignedUrlAction(attachmentId: string) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) throw new Error("Not authorized.");
  return expenseService.getAttachmentSignedUrl(attachmentId);
}

// ---- Payables ----

export async function createPayableAction(input: PayableInput) {
  const admin = await requireFinanceAccess();
  const payable = await payableService.create(input, admin.id, admin.name);
  revalidatePath("/admin/accounting/payables");
  return payable;
}

export async function approvePayableAction(id: string) {
  const admin = await requireFinanceAccess();
  await payableService.approve(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/payables");
}

export async function cancelPayableAction(id: string) {
  const admin = await requireFinanceAccess();
  await payableService.cancel(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/payables");
}

export async function recordPayablePaymentAction(id: string, amount: number, paymentMethod?: string, referenceNumber?: string) {
  const admin = await requireFinanceAccess();
  const payable = await payableService.recordPayment(id, amount, admin.id, admin.name, paymentMethod, referenceNumber);
  revalidateAll();
  return payable;
}

// ---- Commission rules ----

export async function createCommissionRuleAction(input: CommissionRuleInput) {
  const admin = await requireFinanceAccess();
  const rule = await commissionRuleService.create(input, admin.id);
  revalidatePath("/admin/accounting/commissions");
  return rule;
}

export async function updateCommissionRuleAction(id: string, input: Partial<CommissionRuleInput>) {
  await requireFinanceAccess();
  await commissionRuleService.update(id, input);
  revalidatePath("/admin/accounting/commissions");
}

export async function setCommissionRuleActiveAction(id: string, active: boolean) {
  await requireFinanceAccess();
  await commissionRuleService.setActive(id, active);
  revalidatePath("/admin/accounting/commissions");
}

// ---- Agent commissions ----

export async function calculateCommissionAction(dealId: string, ruleId: string) {
  const admin = await requireFinanceAccess();
  const commission = await agentCommissionService.calculateForDeal(dealId, ruleId, admin.id, admin.name);
  revalidatePath("/admin/accounting/commissions");
  revalidatePath(`/admin/deals/${dealId}`);
  return commission;
}

export async function submitCommissionForApprovalAction(id: string) {
  const admin = await requireFinanceAccess();
  await agentCommissionService.submitForApproval(id, admin.id, admin.name);
  revalidatePath("/admin/accounting/commissions");
}

export async function approveCommissionAction(id: string) {
  const admin = await requireFinanceAccess();
  const commission = await agentCommissionService.approve(id, admin.id, admin.name);
  revalidateAll();
  revalidatePath(`/admin/deals/${commission.dealId}`);
  return commission;
}

export async function recordCommissionPaymentAction(id: string, amount: number) {
  const admin = await requireFinanceAccess();
  const commission = await agentCommissionService.recordPayment(id, amount, admin.id, admin.name);
  revalidateAll();
  revalidatePath(`/admin/deals/${commission.dealId}`);
  return commission;
}

export async function recalculateCommissionAction(id: string, newAmount: number, reason: string) {
  const admin = await requireFinanceAccess();
  const commission = await agentCommissionService.recalculate(id, newAmount, reason, admin.id, admin.name);
  revalidatePath("/admin/accounting/commissions");
  revalidatePath(`/admin/deals/${commission.dealId}`);
  return commission;
}

export async function cancelCommissionAction(id: string, reason: string) {
  const admin = await requireFinanceAccess();
  await agentCommissionService.cancel(id, reason, admin.id, admin.name);
  revalidatePath("/admin/accounting/commissions");
}

// ---- Adjustments ----

export async function createAdjustmentAction(input: FinancialAdjustmentInput) {
  const admin = await requireFinanceAccess();
  const adjustment = await financialAdjustmentService.create(input, admin.id, admin.name);
  revalidateAll();
  return adjustment;
}

// ---- Reconciliation ----

export async function recordReconciliationAction(transactionId: string, status: ReconciliationStatus, input?: { statementReference?: string; matchedAmount?: number; notes?: string }) {
  const admin = await requireFinanceAccess();
  const record = await reconciliationService.record(transactionId, status, admin.id, admin.name, input);
  revalidatePath("/admin/accounting/reconciliation");
  return record;
}

// ---- Receivables (section 22) — manual, on-demand reminder; the
// automatic once-per-day sweep lives in communicationReminderService
// (STEP 22) and fires from the overdue-payments admin page load. This
// is the explicit "Send Reminder" button action for a single deal. ----

export async function sendReceivableReminderAction(dealId: string) {
  const admin = await requireFinanceAccess();
  const deal = await dealService.getById(dealId);
  if (!deal) throw new Error("Deal not found.");
  if (!deal.customerId) throw new Error("This deal has no linked customer.");
  const phone = deal.customerWhatsapp || deal.customerPhone;
  if (!phone) throw new Error("This customer has no WhatsApp/phone number on file.");

  const body = `Assalam-o-Alaikum ${deal.customerName ?? ""}, this is 5STAR.M Estate & Builders — a reminder that ${formatPKR(deal.outstandingAmount)} is outstanding on deal ${deal.dealNumber}. Please contact us to arrange payment.`;
  const conversation = await communicationService.findOrCreateForCustomer(deal.customerId, "WHATSAPP", { dealId, counterpartName: deal.customerName, counterpartPhone: phone });
  const result = await communicationService.composeAndSend({ conversationId: conversation.id, channel: "WHATSAPP", direction: "OUTBOUND", body, isMarketing: false, recipientPhone: phone }, { adminId: admin.id, name: admin.name });
  if (result.status === "FAILED") throw new Error(result.failureReason || "Could not send this reminder.");
  return result;
}

// ---- Settings ----

export async function updateAccountingSettingsAction(input: AccountingSettingsInput) {
  await requireFinanceAccess();
  await accountingSettingsService.update(input);
  revalidatePath("/admin/accounting/settings");
}
