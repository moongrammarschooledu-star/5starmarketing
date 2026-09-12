import "server-only";
import { createClient } from "@/lib/supabase/server";
import { financialAuditService } from "./financialAuditService";
import type {
  FinancialTransaction,
  FinancialTransactionInput,
  TransactionSearchFilters,
  TransactionSearchResult,
  TransactionType,
  CashFlowSummary,
  ProfitLossSummary,
} from "@/lib/models/accounting";
import { DEFAULT_TRANSACTION_PAGE_SIZE, MAX_TRANSACTION_PAGE_SIZE } from "@/lib/models/accounting";

const SELECT =
  "*, accounts(name), deals(deal_number), customer_profiles(full_name), properties(title), projects(name), admin_profiles!financial_transactions_agent_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FinancialTransaction {
  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    transactionType: row.transaction_type,
    accountId: row.account_id ?? undefined,
    accountName: row.accounts?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_profiles?.full_name ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    agentId: row.agent_id ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
    paymentId: row.payment_id ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method ?? undefined,
    referenceNumber: row.reference_number ?? undefined,
    transactionDate: row.transaction_date,
    description: row.description ?? undefined,
    status: row.status,
    reversedTransactionId: row.reversed_transaction_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const financialTransactionService = {
  async search(filters: TransactionSearchFilters): Promise<TransactionSearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_TRANSACTION_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE));
    const supabase = await createClient();

    let query = supabase.from("financial_transactions").select(SELECT, { count: "exact" });
    if (filters.transactionType) query = query.eq("transaction_type", filters.transactionType);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.dealId) query = query.eq("deal_id", filters.dealId);
    if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.agentId) query = query.eq("agent_id", filters.agentId);
    if (filters.dateFrom) query = query.gte("transaction_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("transaction_date", filters.dateTo);
    if (filters.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`transaction_number.ilike.%${q}%,description.ilike.%${q}%,reference_number.ilike.%${q}%`);
    }
    query = query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error("financialTransactionService.search failed:", error);
      throw new Error("Could not load transactions.");
    }
    const total = count ?? 0;
    return { transactions: (data ?? []).map(mapRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  async getById(id: string): Promise<FinancialTransaction | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("financial_transactions").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Creates a transaction — status defaults to CONFIRMED (a completed,
   *  real financial event) unless the caller explicitly requests DRAFT/
   *  PENDING (section 9). transaction_number is generated server-side
   *  by the DB default, never trusted from the client (section 10). */
  async create(input: FinancialTransactionInput, actorId?: string): Promise<FinancialTransaction> {
    if (input.amount < 0) throw new Error("Amount cannot be negative.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        transaction_type: input.transactionType,
        account_id: input.accountId || null,
        deal_id: input.dealId || null,
        customer_id: input.customerId || null,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        agent_id: input.agentId || null,
        payment_id: input.paymentId || null,
        amount: input.amount,
        currency: input.currency || "PKR",
        payment_method: input.paymentMethod || null,
        reference_number: input.referenceNumber || null,
        transaction_date: input.transactionDate || new Date().toISOString().slice(0, 10),
        description: input.description || null,
        status: input.status || "CONFIRMED",
        created_by: actorId || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("financialTransactionService.create failed:", error);
      throw new Error("Could not create this transaction.");
    }
    const transaction = mapRow(data);
    await financialAuditService.log({ entityType: "transaction", entityId: transaction.id, action: "Created", actorId, newValue: { type: transaction.transactionType, amount: transaction.amount, status: transaction.status } });
    return transaction;
  },

  async confirm(id: string, actorId?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("financial_transactions").update({ status: "CONFIRMED" }).eq("id", id).in("status", ["DRAFT", "PENDING"]);
    if (error) throw new Error("Could not confirm this transaction.");
    await financialAuditService.log({ entityType: "transaction", entityId: id, action: "Confirmed", actorId });
  },

  async cancel(id: string, actorId?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("financial_transactions").update({ status: "CANCELLED" }).eq("id", id).in("status", ["DRAFT", "PENDING"]);
    if (error) throw new Error("Could not cancel this transaction.");
    await financialAuditService.log({ entityType: "transaction", entityId: id, action: "Cancelled", actorId });
  },

  /** Reverses a CONFIRMED transaction with a NEW linked transaction
   *  (section 9/57 — never edits or deletes the original). */
  async reverse(id: string, reason: string, actorId?: string, actorName?: string): Promise<FinancialTransaction> {
    const original = await this.getById(id);
    if (!original) throw new Error("Transaction not found.");
    if (original.status !== "CONFIRMED") throw new Error("Only a confirmed transaction can be reversed.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        transaction_type: original.transactionType,
        account_id: original.accountId || null,
        deal_id: original.dealId || null,
        customer_id: original.customerId || null,
        property_id: original.propertyId || null,
        project_id: original.projectId || null,
        agent_id: original.agentId || null,
        payment_id: original.paymentId || null,
        amount: original.amount,
        currency: original.currency,
        payment_method: original.paymentMethod || null,
        reference_number: original.referenceNumber || null,
        transaction_date: new Date().toISOString().slice(0, 10),
        description: `Reversal of ${original.transactionNumber}: ${reason}`,
        status: "REVERSED",
        reversed_transaction_id: original.id,
        created_by: actorId || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("financialTransactionService.reverse failed:", error);
      throw new Error("Could not reverse this transaction.");
    }

    await supabase.from("financial_transactions").update({ status: "REVERSED" }).eq("id", id);
    await financialAuditService.log({ entityType: "transaction", entityId: id, action: "Reversed", actorId, actorName, reason });
    return mapRow(data);
  },

  // ---- Dashboard / reports (sections 36-40) ----
  async cashFlow(dateFrom: string, dateTo: string): Promise<CashFlowSummary> {
    const supabase = await createClient();
    const [{ data: before }, { data: within }] = await Promise.all([
      supabase.from("financial_transactions").select("transaction_type, amount").eq("status", "CONFIRMED").lt("transaction_date", dateFrom),
      supabase.from("financial_transactions").select("transaction_type, amount").eq("status", "CONFIRMED").gte("transaction_date", dateFrom).lte("transaction_date", dateTo),
    ]);
    const inflowTypes: TransactionType[] = ["INCOME"];
    const outflowTypes: TransactionType[] = ["EXPENSE", "COMMISSION", "PAYABLE", "REFUND"];

    const sum = (rows: { transaction_type: string; amount: number }[] | null, types: TransactionType[]) =>
      (rows ?? []).filter((r) => types.includes(r.transaction_type as TransactionType)).reduce((total, r) => total + Number(r.amount), 0);

    const openingBalance = sum(before, inflowTypes) - sum(before, outflowTypes);
    const cashInflow = sum(within, inflowTypes);
    const cashOutflow = sum(within, outflowTypes);

    return {
      openingBalance,
      cashInflow,
      cashOutflow,
      netCashFlow: cashInflow - cashOutflow,
      closingBalance: openingBalance + cashInflow - cashOutflow,
      periodFrom: dateFrom,
      periodTo: dateTo,
    };
  },

  async profitLoss(dateFrom: string, dateTo: string): Promise<ProfitLossSummary> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("financial_transactions")
      .select("transaction_type, amount, account_id, accounts(account_type)")
      .eq("status", "CONFIRMED")
      .gte("transaction_date", dateFrom)
      .lte("transaction_date", dateTo);

    const rows = data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sumType = (type: string) => rows.filter((r: any) => r.transaction_type === type).reduce((t: number, r: any) => t + Number(r.amount), 0);

    const revenue = sumType("INCOME");
    const commissions = sumType("COMMISSION");
    const operatingExpenses = sumType("EXPENSE");
    const directCosts = 0; // no cost-of-sales concept beyond direct expenses tagged EXPENSE (see PropertyProfitability for cost breakdowns)
    const grossProfit = revenue - directCosts;
    const netProfit = grossProfit - operatingExpenses - commissions;

    return { revenue, directCosts, grossProfit, operatingExpenses, commissions, netProfit, periodFrom: dateFrom, periodTo: dateTo };
  },
};
