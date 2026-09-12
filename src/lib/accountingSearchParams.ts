import type { ExpenseSearchFilters, TransactionSearchFilters, CommissionSearchFilters, TransactionType, ExpenseStatus, AgentCommissionStatus } from "@/lib/models/accounting";
import { transactionTypes, expenseStatuses, agentCommissionStatuses } from "@/lib/models/accounting";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(sp: RawSearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

function pageOf(sp: RawSearchParams): number {
  const p = Number(one(sp, "page"));
  return Number.isFinite(p) && p > 0 ? p : 1;
}

export function parseTransactionSearchParams(sp: RawSearchParams): TransactionSearchFilters {
  const type = one(sp, "type");
  const status = one(sp, "status");
  return {
    q: one(sp, "q") || undefined,
    transactionType: type && transactionTypes.includes(type as TransactionType) ? (type as TransactionType) : undefined,
    status: status && ["DRAFT", "PENDING", "CONFIRMED", "CANCELLED", "REVERSED"].includes(status) ? (status as TransactionSearchFilters["status"]) : undefined,
    accountId: one(sp, "account") || undefined,
    dealId: one(sp, "deal") || undefined,
    propertyId: one(sp, "property") || undefined,
    projectId: one(sp, "project") || undefined,
    agentId: one(sp, "agent") || undefined,
    dateFrom: one(sp, "from") || undefined,
    dateTo: one(sp, "to") || undefined,
    page: pageOf(sp),
  };
}

export function parseExpenseSearchParams(sp: RawSearchParams): ExpenseSearchFilters {
  const status = one(sp, "status");
  return {
    q: one(sp, "q") || undefined,
    status: status && expenseStatuses.includes(status as ExpenseStatus) ? (status as ExpenseStatus) : undefined,
    accountId: one(sp, "account") || undefined,
    propertyId: one(sp, "property") || undefined,
    projectId: one(sp, "project") || undefined,
    dealId: one(sp, "deal") || undefined,
    agentId: one(sp, "agent") || undefined,
    dateFrom: one(sp, "from") || undefined,
    dateTo: one(sp, "to") || undefined,
    page: pageOf(sp),
  };
}

export function parseCommissionSearchParams(sp: RawSearchParams): CommissionSearchFilters {
  const status = one(sp, "status");
  return {
    agentId: one(sp, "agent") || undefined,
    propertyId: one(sp, "property") || undefined,
    projectId: one(sp, "project") || undefined,
    status: status && agentCommissionStatuses.includes(status as AgentCommissionStatus) ? (status as AgentCommissionStatus) : undefined,
    dateFrom: one(sp, "from") || undefined,
    dateTo: one(sp, "to") || undefined,
    page: pageOf(sp),
  };
}
