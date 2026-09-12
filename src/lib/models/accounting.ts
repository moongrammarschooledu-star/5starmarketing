// ---------------------------------------------------------------------
// STEP 23 — Accounting / Expenses / Profit & Commission Management.
//
// Terminology (section 4) is deliberately precise throughout this file:
// a Deal's finalAmount is never treated as cash received; "revenue" here
// means a CONFIRMED financial_transactions row, not a booked deal value.
// ---------------------------------------------------------------------

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export interface Account {
  id: string;
  accountCode: string;
  name: string;
  accountType: AccountType;
  parentId?: string;
  parentName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountInput = Pick<Account, "accountCode" | "name" | "accountType" | "parentId" | "description">;

/** Shared across expenses/payables/transactions (section 44) — a
 *  distinct, slightly larger set than deal.ts's own PaymentMethod
 *  (which lacks "Card"); deal payments and accounting payments are
 *  different contexts, so a separate type here is intentional, not a
 *  duplication. */
export type FinancePaymentMethod = "Cash" | "Bank Transfer" | "Cheque" | "Online Transfer" | "Card" | "Other";
export const financePaymentMethods: FinancePaymentMethod[] = ["Cash", "Bank Transfer", "Cheque", "Online Transfer", "Card", "Other"];

export type TransactionType = "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" | "COMMISSION" | "REFUND" | "ADJUSTMENT";
export const transactionTypes: TransactionType[] = ["INCOME", "EXPENSE", "RECEIVABLE", "PAYABLE", "COMMISSION", "REFUND", "ADJUSTMENT"];

export type TransactionStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "CANCELLED" | "REVERSED";
export const transactionStatuses: TransactionStatus[] = ["DRAFT", "PENDING", "CONFIRMED", "CANCELLED", "REVERSED"];

export interface FinancialTransaction {
  id: string;
  transactionNumber: string;
  transactionType: TransactionType;
  accountId?: string;
  accountName?: string;
  dealId?: string;
  dealNumber?: string;
  customerId?: string;
  customerName?: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  agentId?: string;
  agentName?: string;
  paymentId?: string;
  amount: number;
  currency: string;
  paymentMethod?: FinancePaymentMethod;
  referenceNumber?: string;
  transactionDate: string;
  description?: string;
  status: TransactionStatus;
  reversedTransactionId?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransactionInput {
  transactionType: TransactionType;
  accountId?: string;
  dealId?: string;
  customerId?: string;
  propertyId?: string;
  projectId?: string;
  agentId?: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  paymentMethod?: FinancePaymentMethod;
  referenceNumber?: string;
  transactionDate?: string;
  description?: string;
  status?: TransactionStatus;
}

export interface TransactionSearchFilters {
  q?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  dealId?: string;
  propertyId?: string;
  projectId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionSearchResult {
  transactions: FinancialTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_TRANSACTION_PAGE_SIZE = 25;
export const MAX_TRANSACTION_PAGE_SIZE = 100;

// ---------------------------------------------------------------------
// Expenses (sections 15-19)
// ---------------------------------------------------------------------
export type ExpenseStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAID";
export const expenseStatuses: ExpenseStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAID"];

/** The one allowed forward path (section 18) — REJECTED is reachable
 *  from SUBMITTED or UNDER_REVIEW only; nothing is reachable once PAID
 *  or REJECTED. Mirrors DealStatus's own "configured, validated
 *  pipeline" convention (deal.ts). */
export const EXPENSE_ALLOWED_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID"],
  REJECTED: [],
  PAID: [],
};

export interface ExpenseAttachment {
  id: string;
  expenseId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  accountId?: string;
  accountName?: string;
  description: string;
  amount: number;
  vendor?: string;
  paymentMethod?: FinancePaymentMethod;
  referenceNumber?: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  dealId?: string;
  dealNumber?: string;
  agentId?: string;
  agentName?: string;
  notes?: string;
  status: ExpenseStatus;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  paidAt?: string;
  transactionId?: string;
  attachments?: ExpenseAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, "expenseDate" | "accountId" | "description" | "amount" | "vendor" | "paymentMethod" | "referenceNumber" | "propertyId" | "projectId" | "dealId" | "agentId" | "notes">;

export interface ExpenseSearchFilters {
  q?: string;
  status?: ExpenseStatus;
  accountId?: string;
  propertyId?: string;
  projectId?: string;
  dealId?: string;
  agentId?: string;
  submittedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpenseSearchResult {
  expenses: Expense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Receivables (sections 20-22) — computed live from `deals`, never a
// persisted table (see migration DESIGN NOTE).
// ---------------------------------------------------------------------
export type ReceivableStatus = "CURRENT" | "DUE_SOON" | "OVERDUE" | "PAID" | "PARTIALLY_PAID";
export const receivableStatuses: ReceivableStatus[] = ["CURRENT", "DUE_SOON", "OVERDUE", "PAID", "PARTIALLY_PAID"];

export interface Receivable {
  dealId: string;
  dealNumber: string;
  customerId?: string;
  customerName?: string;
  propertyId?: string;
  propertyTitle?: string;
  totalAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  dueDate?: string;
  daysOverdue: number;
  status: ReceivableStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
}

// ---------------------------------------------------------------------
// Payables (sections 23-24)
// ---------------------------------------------------------------------
export type PayableStatus = "DRAFT" | "PENDING" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
export const payableStatuses: PayableStatus[] = ["DRAFT", "PENDING", "APPROVED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export interface Payable {
  id: string;
  payableNumber: string;
  vendor: string;
  description?: string;
  amount: number;
  dueDate?: string;
  paidAmount: number;
  outstandingAmount: number;
  status: PayableStatus;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  dealId?: string;
  dealNumber?: string;
  agentCommissionId?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayableInput = Pick<Payable, "vendor" | "description" | "amount" | "dueDate" | "propertyId" | "projectId" | "dealId" | "notes">;

// ---------------------------------------------------------------------
// Commission rules engine (sections 25-27)
// ---------------------------------------------------------------------
export type CommissionBasis = "DEAL_AMOUNT" | "COLLECTED_AMOUNT" | "FIXED" | "TIERED";
export const commissionBases: CommissionBasis[] = ["DEAL_AMOUNT", "COLLECTED_AMOUNT", "FIXED", "TIERED"];

export type CommissionConditionType = "PROPERTY" | "PROJECT" | "PROPERTY_TYPE" | "DEAL_TYPE" | "AGENT" | "TEAM";
export const commissionConditionTypes: CommissionConditionType[] = ["PROPERTY", "PROJECT", "PROPERTY_TYPE", "DEAL_TYPE", "AGENT", "TEAM"];

export interface CommissionRuleTier {
  id: string;
  ruleId: string;
  minAmount: number;
  maxAmount?: number;
  rate: number;
}

export interface CommissionRuleCondition {
  id: string;
  ruleId: string;
  conditionType: CommissionConditionType;
  conditionValue: string;
  conditionLabel?: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  active: boolean;
  basis: CommissionBasis;
  rate?: number;
  fixedAmount?: number;
  priority: number;
  tiers?: CommissionRuleTier[];
  conditions?: CommissionRuleCondition[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRuleInput {
  name: string;
  active?: boolean;
  basis: CommissionBasis;
  rate?: number;
  fixedAmount?: number;
  priority?: number;
  tiers?: { minAmount: number; maxAmount?: number; rate: number }[];
  conditions?: { conditionType: CommissionConditionType; conditionValue: string }[];
}

// ---------------------------------------------------------------------
// Agent commissions (sections 28-32)
// ---------------------------------------------------------------------
export type AgentCommissionStatus = "CALCULATED" | "PENDING_APPROVAL" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export const agentCommissionStatuses: AgentCommissionStatus[] = ["CALCULATED", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_PAID", "PAID", "CANCELLED"];

export interface AgentCommission {
  id: string;
  commissionNumber: string;
  agentId?: string;
  agentName?: string;
  dealId: string;
  dealNumber?: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  commissionRuleId?: string;
  commissionRuleName?: string;
  basis: CommissionBasis;
  basisAmount: number;
  commissionRate?: number;
  commissionAmount: number;
  status: AgentCommissionStatus;
  paidAmount: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  paidAt?: string;
  payableId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCommissionAdjustment {
  id: string;
  commissionId: string;
  previousAmount: number;
  newAmount: number;
  reason: string;
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
}

export interface CommissionSearchFilters {
  agentId?: string;
  propertyId?: string;
  projectId?: string;
  status?: AgentCommissionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface CommissionSearchResult {
  commissions: AgentCommission[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Financial adjustments (section 48)
// ---------------------------------------------------------------------
export type AdjustmentType = "INCOME" | "EXPENSE" | "COMMISSION" | "RECEIVABLE" | "PAYABLE" | "OTHER";
export const adjustmentTypes: AdjustmentType[] = ["INCOME", "EXPENSE", "COMMISSION", "RECEIVABLE", "PAYABLE", "OTHER"];

export interface FinancialAdjustment {
  id: string;
  adjustmentNumber: string;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string;
  reference?: string;
  dealId?: string;
  dealNumber?: string;
  propertyId?: string;
  projectId?: string;
  customerId?: string;
  transactionId?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

export type FinancialAdjustmentInput = Pick<FinancialAdjustment, "adjustmentType" | "amount" | "reason" | "reference" | "dealId" | "propertyId" | "projectId" | "customerId">;

// ---------------------------------------------------------------------
// Reconciliation (sections 45-46)
// ---------------------------------------------------------------------
export type ReconciliationStatus = "MATCHED" | "UNMATCHED" | "IGNORED" | "ADJUSTMENT_REQUIRED";
export const reconciliationStatuses: ReconciliationStatus[] = ["MATCHED", "UNMATCHED", "IGNORED", "ADJUSTMENT_REQUIRED"];

export interface ReconciliationRecord {
  id: string;
  transactionId: string;
  transactionNumber?: string;
  transactionAmount?: number;
  transactionDate?: string;
  statementReference?: string;
  matchedAmount?: number;
  reconciliationStatus: ReconciliationStatus;
  reconciledBy?: string;
  reconciledByName?: string;
  reconciledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Audit log (section 56)
// ---------------------------------------------------------------------
export interface FinancialAuditLogEntry {
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
// Settings (singleton)
// ---------------------------------------------------------------------
export type CommissionCalcBasis = "DEAL_AMOUNT" | "COLLECTED_AMOUNT";

export interface AccountingSettings {
  defaultCommissionBasis: CommissionCalcBasis;
  fiscalYearStartMonth: number;
  currency: string;
  updatedAt: string;
}

export type AccountingSettingsInput = Partial<Omit<AccountingSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// Dashboard / reports (sections 3, 33-42, 69)
// ---------------------------------------------------------------------
export interface AccountingDashboardStats {
  totalRevenue: number;
  collectedRevenue: number;
  outstandingReceivables: number;
  totalExpenses: number;
  agentCommissions: number;
  commissionsPaid: number;
  grossProfit: number;
  netProfit: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  todaysCollection: number;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  overdueReceivablesCount: number;
  overdueReceivablesAmount: number;
  pendingCommissionsCount: number;
  pendingCommissionsAmount: number;
  bestPerformingPropertyTitle?: string;
  bestPerformingProjectName?: string;
  topAgentName?: string;
}

export interface CashFlowSummary {
  openingBalance: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  closingBalance: number;
  periodFrom: string;
  periodTo: string;
}

export interface ProfitLossSummary {
  revenue: number;
  directCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  commissions: number;
  netProfit: number;
  periodFrom: string;
  periodTo: string;
}

export interface DealProfitability {
  dealId: string;
  dealNumber: string;
  revenue: number;
  directCosts: number;
  allocatedExpenses: number;
  commission: number;
  netProfit: number;
  isEstimate: boolean;
}

export interface PropertyProfitability {
  propertyId: string;
  propertyTitle: string;
  saleRevenue: number;
  costs: number;
  marketingCost: number;
  commission: number;
  profit: number;
  hasSufficientData: boolean;
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  totalSales: number;
  collected: number;
  outstanding: number;
  projectExpenses: number;
  commissions: number;
  estimatedProfit: number;
  realizedProfit: number;
}

export interface AgentFinancialSummary {
  agentId: string;
  agentName: string;
  dealsCount: number;
  salesValue: number;
  collectedValue: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionPending: number;
}
