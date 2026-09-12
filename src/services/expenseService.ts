import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialTransactionService } from "./financialTransactionService";
import { financialAuditService } from "./financialAuditService";
import { staffNotificationService } from "./staffNotificationService";
import { parseExpenseAttachmentDataUri, buildExpenseAttachmentPath, uploadExpenseAttachmentFile, createSignedExpenseAttachmentUrl } from "@/lib/accounting/expenseAttachmentStorage";
import { EXPENSE_ALLOWED_TRANSITIONS } from "@/lib/models/accounting";
import type { Expense, ExpenseInput, ExpenseSearchFilters, ExpenseSearchResult, ExpenseStatus, ExpenseAttachment } from "@/lib/models/accounting";
import { DEFAULT_TRANSACTION_PAGE_SIZE, MAX_TRANSACTION_PAGE_SIZE } from "@/lib/models/accounting";

const SELECT =
  "*, accounts(name), properties(title), projects(name), deals(deal_number), admin_profiles!expenses_agent_id_fkey(name), submitted:admin_profiles!expenses_submitted_by_fkey(name), reviewed:admin_profiles!expenses_reviewed_by_fkey(name), approved:admin_profiles!expenses_approved_by_fkey(name), expense_attachments(*)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Expense {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    expenseDate: row.expense_date,
    accountId: row.account_id ?? undefined,
    accountName: row.accounts?.name ?? undefined,
    description: row.description,
    amount: Number(row.amount),
    vendor: row.vendor ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    referenceNumber: row.reference_number ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    agentId: row.agent_id ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    submittedBy: row.submitted_by ?? undefined,
    submittedByName: row.submitted?.name ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedByName: row.reviewed?.name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedByName: row.approved?.name ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectedReason: row.rejected_reason ?? undefined,
    paidAt: row.paid_at ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    attachments: Array.isArray(row.expense_attachments)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.expense_attachments.map((a: any): ExpenseAttachment => ({ id: a.id, expenseId: row.id, storagePath: a.storage_path, fileName: a.file_name, mimeType: a.mime_type, fileSize: a.file_size, createdAt: a.created_at }))
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: ExpenseStatus, to: ExpenseStatus) {
  if (!EXPENSE_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`An expense cannot move from ${from} to ${to}.`);
  }
}

export const expenseService = {
  async search(filters: ExpenseSearchFilters): Promise<ExpenseSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_TRANSACTION_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("expenses").select(SELECT, { count: "exact" });
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.dealId) query = query.eq("deal_id", filters.dealId);
    if (filters.agentId) query = query.eq("agent_id", filters.agentId);
    if (filters.submittedBy) query = query.eq("submitted_by", filters.submittedBy);
    if (filters.dateFrom) query = query.gte("expense_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("expense_date", filters.dateTo);
    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`expense_number.ilike.%${q}%,description.ilike.%${q}%,vendor.ilike.%${q}%`);
    }
    query = query.order("expense_date", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("expenseService.search failed:", error);
      throw new Error("Could not load expenses.");
    }
    const total = count ?? 0;
    return { expenses: (data ?? []).map(mapRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async getById(id: string): Promise<Expense | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("expenses").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: ExpenseInput, submittedBy: string, submittedByName: string, saveDraft: boolean): Promise<Expense> {
    if (input.amount < 0) throw new Error("Amount cannot be negative.");
    const supabase = await createClient();
    const status: ExpenseStatus = saveDraft ? "DRAFT" : "SUBMITTED";
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        expense_date: input.expenseDate,
        account_id: input.accountId || null,
        description: input.description,
        amount: input.amount,
        vendor: input.vendor || null,
        payment_method: input.paymentMethod || null,
        reference_number: input.referenceNumber || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        agent_id: input.agentId || null,
        notes: input.notes || null,
        status,
        submitted_by: submittedBy,
        submitted_at: status === "SUBMITTED" ? new Date().toISOString() : null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("expenseService.create failed:", error);
      throw new Error("Could not create this expense.");
    }
    const expense = mapRow(data);
    await financialAuditService.log({ entityType: "expense", entityId: expense.id, action: status === "DRAFT" ? "Created (draft)" : "Submitted", actorId: submittedBy, actorName: submittedByName, newValue: { amount: expense.amount, status } });
    return expense;
  },

  async submit(id: string, actorId?: string, actorName?: string): Promise<void> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, "SUBMITTED");
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").update({ status: "SUBMITTED", submitted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not submit this expense.");
    await financialAuditService.log({ entityType: "expense", entityId: id, action: "Submitted", actorId, actorName });
  },

  async markUnderReview(id: string, actorId: string, actorName: string): Promise<void> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, "UNDER_REVIEW");
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").update({ status: "UNDER_REVIEW", reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not update this expense.");
    await financialAuditService.log({ entityType: "expense", entityId: id, action: "Marked under review", actorId, actorName });
  },

  async approve(id: string, actorId: string, actorName: string): Promise<void> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, "APPROVED");
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").update({ status: "APPROVED", approved_by: actorId, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not approve this expense.");
    await financialAuditService.log({ entityType: "expense", entityId: id, action: "Approved", actorId, actorName });
    if (expense.submittedBy) {
      await staffNotificationService.notify(expense.submittedBy, "expense_approved", "Expense approved", `${expense.expenseNumber} (${expense.description}) was approved.`, "expense", id);
    }
  },

  async reject(id: string, reason: string, actorId: string, actorName: string): Promise<void> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, "REJECTED");
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").update({ status: "REJECTED", rejected_reason: reason, reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not reject this expense.");
    await financialAuditService.log({ entityType: "expense", entityId: id, action: "Rejected", actorId, actorName, reason });
    if (expense.submittedBy) {
      await staffNotificationService.notify(expense.submittedBy, "expense_rejected", "Expense rejected", `${expense.expenseNumber}: ${reason}`, "expense", id);
    }
  },

  /** Marking an approved expense PAID is the ONLY point an expense
   *  generates a financial_transactions row (section 18). */
  async markPaid(id: string, actorId: string, actorName: string): Promise<Expense> {
    const expense = await this.getById(id);
    if (!expense) throw new Error("Expense not found.");
    assertTransition(expense.status, "PAID");

    const transaction = await financialTransactionService.create(
      {
        transactionType: "EXPENSE",
        accountId: expense.accountId,
        propertyId: expense.propertyId,
        projectId: expense.projectId,
        dealId: expense.dealId,
        agentId: expense.agentId,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        referenceNumber: expense.referenceNumber,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: `Expense ${expense.expenseNumber}: ${expense.description}`,
        status: "CONFIRMED",
      },
      actorId
    );

    const supabase = await createClient();
    const { data, error } = await supabase.from("expenses").update({ status: "PAID", paid_at: new Date().toISOString(), transaction_id: transaction.id }).eq("id", id).select(SELECT).single();
    if (error) throw new Error("Could not mark this expense as paid.");
    await financialAuditService.log({ entityType: "expense", entityId: id, action: "Paid", actorId, actorName, newValue: { transactionId: transaction.id } });
    return mapRow(data);
  },

  async uploadAttachment(expenseId: string, fileName: string, dataUri: string): Promise<ExpenseAttachment> {
    const { mimeType, bytes, extension } = parseExpenseAttachmentDataUri(dataUri);
    const path = buildExpenseAttachmentPath(expenseId, extension);
    await uploadExpenseAttachmentFile(path, bytes, mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expense_attachments")
      .insert({ expense_id: expenseId, storage_path: path, file_name: fileName.slice(0, 200), mime_type: mimeType, file_size: bytes.byteLength })
      .select("*")
      .single();
    if (error) {
      console.error("expenseService.uploadAttachment failed:", error);
      throw new Error("Could not attach this receipt.");
    }
    return { id: data.id, expenseId, storagePath: data.storage_path, fileName: data.file_name, mimeType: data.mime_type, fileSize: data.file_size, createdAt: data.created_at };
  },

  async getAttachmentSignedUrl(attachmentId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("expense_attachments").select("storage_path").eq("id", attachmentId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this file.");
    return createSignedExpenseAttachmentUrl(data.storage_path);
  },
};
