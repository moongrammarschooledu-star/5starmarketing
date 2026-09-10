export type DealType = "Property Sale" | "Property Purchase" | "Property Rent" | "Project Booking" | "Investment" | "Other";

export type DealStatus = "New" | "Negotiation" | "Booking Pending" | "Booked" | "Documentation" | "Payment In Progress" | "Completed" | "Cancelled";

export type BookingStatus = "Pending" | "Received" | "Refunded" | "Adjusted";

export type CommissionStatus = "Pending" | "Approved" | "Partially Paid" | "Paid";

export type CancellationReason = "Customer Cancelled" | "Payment Issue" | "Property Unavailable" | "Documentation Issue" | "Other";

export const dealTypes: DealType[] = ["Property Sale", "Property Purchase", "Property Rent", "Project Booking", "Investment", "Other"];

/** The configured, validated pipeline (section 6/61) — a status may
 *  only move to the next entry in this array, or jump straight to
 *  "Cancelled" from any non-terminal stage. dealService.updateStatus()
 *  enforces this; the DB doesn't (Postgres check constraints can't
 *  express "valid from current row value" without a trigger, and a
 *  trigger would fight with admin corrections) — so this is the single
 *  source of truth for the rule, referenced by both the server action
 *  and the pipeline UI. */
export const dealStatuses: DealStatus[] = ["New", "Negotiation", "Booking Pending", "Booked", "Documentation", "Payment In Progress", "Completed"];
export const allDealStatuses: DealStatus[] = [...dealStatuses, "Cancelled"];

export const bookingStatuses: BookingStatus[] = ["Pending", "Received", "Refunded", "Adjusted"];
export const commissionStatuses: CommissionStatus[] = ["Pending", "Approved", "Partially Paid", "Paid"];
export const cancellationReasons: CancellationReason[] = ["Customer Cancelled", "Payment Issue", "Property Unavailable", "Documentation Issue", "Other"];

/** Property statuses this deal type is allowed to drive automatically
 *  (section 46) — a Rent/Investment/Other deal reaching "Completed"
 *  never forces a property to "Sold", since that wouldn't be accurate. */
export const PROPERTY_SALE_DEAL_TYPES: DealType[] = ["Property Sale", "Property Purchase", "Project Booking"];

export interface Deal {
  id: string;
  dealNumber: string;
  leadId?: string;
  customerId?: string;
  propertyId?: string;
  projectId?: string;
  agentId?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerNotes?: string;
  dealType: DealType;
  status: DealStatus;
  propertyPrice?: number;
  negotiatedPrice: number;
  discountAmount: number;
  discountReason?: string;
  finalAmount: number;
  bookingAmount: number;
  bookingDate?: string;
  bookingStatus: BookingStatus;
  receivedAmount: number;
  outstandingAmount: number;
  commissionRate?: number;
  commissionAmount?: number;
  commissionOverrideReason?: string;
  commissionStatus: CommissionStatus;
  commissionPaidAmount: number;
  commissionPaidAt?: string;
  expectedCompletionDate?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: CancellationReason;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;

  // Joined, display-only fields — always fetched fresh from the source
  // record, never a stale snapshot (section 9/10).
  customerName?: string;
  customerPhone?: string;
  customerWhatsapp?: string;
  customerEmail?: string;
  propertyTitle?: string;
  propertySlug?: string;
  propertyImage?: string;
  propertyType?: string;
  propertyLocation?: string;
  propertySize?: string;
  propertyStatus?: string;
  projectName?: string;
  agentName?: string;
  leadName?: string;
}

export type DealInput = Omit<
  Deal,
  | "id"
  | "dealNumber"
  | "finalAmount"
  | "outstandingAmount"
  | "receivedAmount"
  | "commissionPaidAmount"
  | "completedAt"
  | "cancelledAt"
  | "createdBy"
  | "createdByName"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "bookingStatus"
  | "commissionStatus"
  | "customerName"
  | "customerPhone"
  | "customerWhatsapp"
  | "customerEmail"
  | "propertyTitle"
  | "propertySlug"
  | "propertyImage"
  | "propertyType"
  | "propertyLocation"
  | "propertySize"
  | "propertyStatus"
  | "projectName"
  | "agentName"
  | "leadName"
> & {
  status?: DealStatus;
  bookingStatus?: BookingStatus;
  commissionStatus?: CommissionStatus;
};

export interface DealDashboardStats {
  totalDeals: number;
  active: number;
  bookingPending: number;
  bookingConfirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalDealValue: number;
  totalReceived: number;
  outstandingAmount: number;
  expectedCommission: number;
  paidCommission: number;
}

// ---------------------------------------------------------------------
// Payments (section 15-19)
// ---------------------------------------------------------------------
export type PaymentType = "Booking" | "Installment" | "Down Payment" | "Full Payment" | "Other";
export type PaymentMethod = "Cash" | "Bank Transfer" | "Cheque" | "Online Transfer" | "Other";
export type PaymentStatus = "Pending" | "Received" | "Verified" | "Rejected" | "Refunded";

export const paymentTypes: PaymentType[] = ["Booking", "Installment", "Down Payment", "Full Payment", "Other"];
export const paymentMethods: PaymentMethod[] = ["Cash", "Bank Transfer", "Cheque", "Online Transfer", "Other"];
export const paymentStatuses: PaymentStatus[] = ["Pending", "Received", "Verified", "Rejected", "Refunded"];

export interface DealPayment {
  id: string;
  dealId: string;
  scheduleItemId?: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  reference?: string;
  paymentDate: string;
  status: PaymentStatus;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealPaymentInput = Pick<DealPayment, "amount" | "paymentType" | "paymentMethod" | "reference" | "paymentDate" | "notes" | "scheduleItemId"> & {
  status?: PaymentStatus;
};

// ---------------------------------------------------------------------
// Refunds (section 32) — a linked reversal, the original payment is
// never edited or deleted.
// ---------------------------------------------------------------------
export type RefundStatus = "Pending" | "Completed" | "Rejected";
export const refundStatuses: RefundStatus[] = ["Pending", "Completed", "Rejected"];

export interface DealPaymentRefund {
  id: string;
  paymentId: string;
  dealId: string;
  amount: number;
  refundDate: string;
  reason?: string;
  reference?: string;
  status: RefundStatus;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Documents (section 23-25)
// ---------------------------------------------------------------------
export type DealDocumentType =
  | "Booking Form"
  | "Agreement"
  | "Payment Receipt"
  | "CNIC/Customer Document Reference"
  | "Property Document"
  | "NOC"
  | "Transfer Document"
  | "Other";
export type DealDocumentStatus = "Submitted" | "Under Review" | "Approved" | "Rejected";

export const dealDocumentTypes: DealDocumentType[] = [
  "Booking Form",
  "Agreement",
  "Payment Receipt",
  "CNIC/Customer Document Reference",
  "Property Document",
  "NOC",
  "Transfer Document",
  "Other",
];
export const dealDocumentStatuses: DealDocumentStatus[] = ["Submitted", "Under Review", "Approved", "Rejected"];

/** The default checklist shown against a deal's uploaded documents
 *  (section 25) — a starting point, not a hardcoded legal requirement;
 *  any document type from `dealDocumentTypes` can still be uploaded. */
export const DEFAULT_DEAL_DOCUMENT_CHECKLIST: DealDocumentType[] = ["Booking Form", "Agreement", "Payment Receipt", "Property Document"];

export interface DealDocument {
  id: string;
  dealId: string;
  name: string;
  url: string;
  documentType: DealDocumentType;
  status: DealDocumentStatus;
  uploadedBy?: string;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Notes (section 26) — private, CRM-staff only.
// ---------------------------------------------------------------------
export interface DealNote {
  id: string;
  dealId: string;
  note: string;
  createdBy?: string;
  userId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Payment schedule (section 20) — real transaction tracking against the
// EXISTING STEP 12 payment_schedule_items for the deal's property, not
// a duplicate calculator.
// ---------------------------------------------------------------------
export type InstallmentStatus = "Upcoming" | "Due" | "Partially Paid" | "Paid" | "Overdue";

export interface DealScheduleInstallment {
  id: string;
  installmentNumber: number;
  dueDate?: string;
  amount: number;
  description: string;
  paidAmount: number;
  remaining: number;
  status: InstallmentStatus;
}

// ---------------------------------------------------------------------
// Search (section 37-40)
// ---------------------------------------------------------------------
export const DEFAULT_DEAL_PAGE_SIZE = 20;
export const MAX_DEAL_PAGE_SIZE = 100;

export type DealPaymentStatusFilter = "unpaid" | "partial" | "paid";
export type DealSortKey = "newest" | "oldest" | "value_desc" | "value_asc";

export interface DealSearchFilters {
  q?: string;
  status?: DealStatus;
  dealType?: DealType;
  agentId?: string;
  propertyId?: string;
  projectId?: string;
  paymentStatus?: DealPaymentStatusFilter;
  commissionStatus?: CommissionStatus;
  dateFrom?: string;
  dateTo?: string;
  sort?: DealSortKey;
  page?: number;
  pageSize?: number;
}

export interface DealSearchResult {
  deals: Deal[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Reports (section 42-44)
// ---------------------------------------------------------------------
export interface MonthlySalesRow {
  month: string; // "2026-09"
  deals: number;
  dealValue: number;
  received: number;
  outstanding: number;
  completed: number;
}

export interface AgentSalesRow {
  agentId: string;
  agentName: string;
  deals: number;
  completed: number;
  dealValue: number;
  commissionEarned: number;
  commissionPaid: number;
}

export interface PropertySalesRow {
  propertyId: string;
  propertyTitle: string;
  deals: number;
  dealValue: number;
  received: number;
  outstanding: number;
  completed: number;
}

export interface ProjectSalesRow {
  projectId: string;
  projectName: string;
  bookings: number;
  dealValue: number;
  received: number;
  outstanding: number;
  completed: number;
}

export interface DealTypeSalesRow {
  dealType: DealType;
  deals: number;
  dealValue: number;
  completed: number;
}

export interface CommissionSummaryRow {
  commissionStatus: CommissionStatus;
  deals: number;
  amount: number;
}

export interface SalesReportSummary {
  hasEnoughData: boolean;
  totalDeals: number;
  completedDeals: number;
  cancelledDeals: number;
  totalDealValue: number;
  totalReceived: number;
  totalOutstanding: number;
  byMonth: MonthlySalesRow[];
  byAgent: AgentSalesRow[];
  byProperty: PropertySalesRow[];
  byProject: ProjectSalesRow[];
  byDealType: DealTypeSalesRow[];
  commissionSummary: CommissionSummaryRow[];
}
