// ---------------------------------------------------------------------
// STEP 27 — Rental & Property Management System models.
// ---------------------------------------------------------------------

export type RentalStatus = "AVAILABLE" | "VACANT" | "OCCUPIED" | "RESERVED" | "UNDER_MAINTENANCE" | "UNAVAILABLE";
export const rentalStatuses: RentalStatus[] = ["AVAILABLE", "VACANT", "OCCUPIED", "RESERVED", "UNDER_MAINTENANCE", "UNAVAILABLE"];

export type FurnishedStatus = "UNFURNISHED" | "SEMI_FURNISHED" | "FURNISHED";
export const furnishedStatuses: FurnishedStatus[] = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"];

export type ResponsibilityParty = "TENANT" | "LANDLORD" | "SHARED";
export const responsibilityParties: ResponsibilityParty[] = ["TENANT", "LANDLORD", "SHARED"];

export type ManagementFeeType = "NONE" | "PERCENTAGE" | "FIXED";
export const managementFeeTypes: ManagementFeeType[] = ["NONE", "PERCENTAGE", "FIXED"];

// ---------------------------------------------------------------------
// Landlords (section 4)
// ---------------------------------------------------------------------
export type LandlordStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export const landlordStatuses: LandlordStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export interface Landlord {
  id: string;
  customerId?: string;
  customerName?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentReference?: string;
  managementAgreementDocumentId?: string;
  managementFeeType: ManagementFeeType;
  managementFeeValue: number;
  status: LandlordStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LandlordInput = {
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentReference?: string;
  managementFeeType?: ManagementFeeType;
  managementFeeValue?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Tenants (section 5)
// ---------------------------------------------------------------------
export type TenantStatus = "PROSPECT" | "APPLICANT" | "ACTIVE" | "NOTICE_GIVEN" | "EXPIRED" | "MOVED_OUT" | "BLACKLISTED";
export const tenantStatuses: TenantStatus[] = ["PROSPECT", "APPLICANT", "ACTIVE", "NOTICE_GIVEN", "EXPIRED", "MOVED_OUT", "BLACKLISTED"];

export interface Tenant {
  id: string;
  customerId?: string;
  customerName?: string;
  name: string;
  phone?: string;
  email?: string;
  currentPropertyId?: string;
  currentPropertyTitle?: string;
  currentUnitId?: string;
  currentUnitNumber?: string;
  status: TenantStatus;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TenantInput = {
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// Rental properties (section 3) — extends an existing property/unit.
// ---------------------------------------------------------------------
export interface RentalProperty {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  propertyLocation?: string;
  unitId?: string;
  unitNumber?: string;
  landlordId?: string;
  landlordName?: string;
  propertyManagerId?: string;
  propertyManagerName?: string;
  rentalStatus: RentalStatus;
  monthlyRent?: number;
  securityDepositAmount?: number;
  availableDate?: string;
  furnishedStatus: FurnishedStatus;
  utilitiesResponsibility: ResponsibilityParty;
  maintenanceResponsibility: ResponsibilityParty;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RentalPropertyInput = {
  propertyId: string;
  unitId?: string;
  landlordId?: string;
  propertyManagerId?: string;
  monthlyRent?: number;
  securityDepositAmount?: number;
  availableDate?: string;
  furnishedStatus?: FurnishedStatus;
  utilitiesResponsibility?: ResponsibilityParty;
  maintenanceResponsibility?: ResponsibilityParty;
  notes?: string;
};

// ---------------------------------------------------------------------
// Rental applications (section 6)
// ---------------------------------------------------------------------
export type RentalApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
export const rentalApplicationStatuses: RentalApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"];

export const RENTAL_APPLICATION_ALLOWED_TRANSITIONS: Record<RentalApplicationStatus, RentalApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export interface RentalApplication {
  id: string;
  applicationNumber: string;
  rentalPropertyId: string;
  propertyTitle?: string;
  applicantCustomerId?: string;
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  requestedMoveInDate?: string;
  proposedRent?: number;
  occupants?: number;
  employmentInfo?: string;
  monthlyIncome?: number;
  notes?: string;
  status: RentalApplicationStatus;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RentalApplicationInput = {
  rentalPropertyId: string;
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  requestedMoveInDate?: string;
  proposedRent?: number;
  occupants?: number;
  employmentInfo?: string;
  monthlyIncome?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Leases (sections 7-8)
// ---------------------------------------------------------------------
export type LeaseStatus = "DRAFT" | "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "TERMINATED" | "CANCELLED";
export const leaseStatuses: LeaseStatus[] = ["DRAFT", "PENDING_SIGNATURE", "ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED", "CANCELLED"];

export const LEASE_ALLOWED_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  DRAFT: ["PENDING_SIGNATURE", "CANCELLED"],
  PENDING_SIGNATURE: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["EXPIRING", "TERMINATED"],
  EXPIRING: ["EXPIRED", "TERMINATED"],
  EXPIRED: ["TERMINATED"],
  TERMINATED: [],
  CANCELLED: [],
};

export type LateFeeType = "NONE" | "FIXED" | "PERCENTAGE" | "DAILY";
export const lateFeeTypes: LateFeeType[] = ["NONE", "FIXED", "PERCENTAGE", "DAILY"];

export interface Lease {
  id: string;
  leaseNumber: string;
  rentalPropertyId: string;
  propertyId?: string;
  propertyTitle?: string;
  unitId?: string;
  unitNumber?: string;
  landlordId: string;
  landlordName?: string;
  tenantId: string;
  tenantName?: string;
  dealId?: string;
  dealNumber?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  lateFeeType: LateFeeType;
  lateFeeValue: number;
  utilitiesResponsibility: ResponsibilityParty;
  maintenanceResponsibility: ResponsibilityParty;
  managementFeeType?: ManagementFeeType;
  managementFeeValue?: number;
  renewalTerms?: string;
  noticePeriodDays: number;
  status: LeaseStatus;
  terminatedAt?: string;
  terminationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeaseInput = {
  rentalPropertyId: string;
  landlordId: string;
  tenantId: string;
  dealId?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  paymentDueDay?: number;
  gracePeriodDays?: number;
  lateFeeType?: LateFeeType;
  lateFeeValue?: number;
  utilitiesResponsibility?: ResponsibilityParty;
  maintenanceResponsibility?: ResponsibilityParty;
  managementFeeType?: ManagementFeeType;
  managementFeeValue?: number;
  renewalTerms?: string;
  noticePeriodDays?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Rent schedules (sections 10-11) — schedule AND invoice, one row.
// ---------------------------------------------------------------------
export type RentScheduleStatus = "UPCOMING" | "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED" | "CANCELLED";
export const rentScheduleStatuses: RentScheduleStatus[] = ["UPCOMING", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED", "CANCELLED"];

export interface RentSchedule {
  id: string;
  invoiceNumber: string;
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  rentAmount: number;
  additionalCharges: number;
  discountAmount: number;
  lateFeeAmount: number;
  taxAmount: number;
  totalDue: number;
  status: RentScheduleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined/computed, never stored (see DESIGN NOTES).
  amountPaid?: number;
  outstanding?: number;
}

export type RentScheduleGenerateInput = {
  leaseId: string;
  numberOfPeriods?: number;
};

export type RentScheduleAdjustmentInput = {
  additionalCharges?: number;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
};

// ---------------------------------------------------------------------
// Rent payments (sections 12-14)
// ---------------------------------------------------------------------
export type RentPaymentMethod = "Cash" | "Bank Transfer" | "Cheque" | "Online Payment" | "Other";
export const rentPaymentMethods: RentPaymentMethod[] = ["Cash", "Bank Transfer", "Cheque", "Online Payment", "Other"];

export type RentPaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED" | "REVERSED";
export const rentPaymentStatuses: RentPaymentStatus[] = ["PENDING", "CONFIRMED", "FAILED", "REFUNDED", "REVERSED"];

export const RENT_PAYMENT_ALLOWED_TRANSITIONS: Record<RentPaymentStatus, RentPaymentStatus[]> = {
  PENDING: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["REFUNDED", "REVERSED"],
  FAILED: [],
  REFUNDED: [],
  REVERSED: [],
};

export interface RentPayment {
  id: string;
  paymentNumber: string;
  leaseId: string;
  rentScheduleId?: string;
  tenantId: string;
  tenantName?: string;
  rentalPropertyId: string;
  propertyTitle?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: RentPaymentMethod;
  referenceNumber?: string;
  status: RentPaymentStatus;
  transactionId?: string;
  notes?: string;
  recordedByName?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RentPaymentInput = {
  leaseId: string;
  rentScheduleId?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: RentPaymentMethod;
  referenceNumber?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// Security deposits + deposit transactions (sections 15-16)
// ---------------------------------------------------------------------
export type DepositStatus = "EXPECTED" | "RECEIVED" | "HELD" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FORFEITED";
export const depositStatuses: DepositStatus[] = ["EXPECTED", "RECEIVED", "HELD", "PARTIALLY_REFUNDED", "REFUNDED", "FORFEITED"];

export interface SecurityDeposit {
  id: string;
  leaseId: string;
  leaseNumber?: string;
  tenantId: string;
  tenantName?: string;
  rentalPropertyId: string;
  propertyTitle?: string;
  amount: number;
  receivedDate?: string;
  status: DepositStatus;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DepositTransactionType = "RECEIVED" | "DEDUCTION" | "REFUND";
export const depositTransactionTypes: DepositTransactionType[] = ["RECEIVED", "DEDUCTION", "REFUND"];

export interface DepositTransaction {
  id: string;
  securityDepositId: string;
  transactionType: DepositTransactionType;
  amount: number;
  reason?: string;
  evidenceDocumentId?: string;
  approvedByName?: string;
  transactionDate: string;
  createdAt: string;
}

export type DepositTransactionInput = {
  transactionType: DepositTransactionType;
  amount: number;
  reason?: string;
  evidenceDocumentId?: string;
  transactionDate?: string;
};

// ---------------------------------------------------------------------
// Rental notices (section 22)
// ---------------------------------------------------------------------
export type NoticeType = "RENT_NOTICE" | "LEASE_EXPIRY_NOTICE" | "RENEWAL_NOTICE" | "MAINTENANCE_NOTICE" | "INSPECTION_NOTICE" | "MOVE_OUT_NOTICE" | "GENERAL_NOTICE";
export const noticeTypes: NoticeType[] = ["RENT_NOTICE", "LEASE_EXPIRY_NOTICE", "RENEWAL_NOTICE", "MAINTENANCE_NOTICE", "INSPECTION_NOTICE", "MOVE_OUT_NOTICE", "GENERAL_NOTICE"];

export type NoticeRecipientType = "TENANT" | "LANDLORD";
export const noticeRecipientTypes: NoticeRecipientType[] = ["TENANT", "LANDLORD"];

export type NoticeStatus = "DRAFT" | "ISSUED" | "ACKNOWLEDGED" | "CANCELLED";
export const noticeStatuses: NoticeStatus[] = ["DRAFT", "ISSUED", "ACKNOWLEDGED", "CANCELLED"];

export interface RentalNotice {
  id: string;
  noticeNumber: string;
  leaseId?: string;
  leaseNumber?: string;
  rentalPropertyId?: string;
  propertyTitle?: string;
  recipientCustomerId?: string;
  recipientName?: string;
  recipientType: NoticeRecipientType;
  noticeType: NoticeType;
  issueDate: string;
  effectiveDate?: string;
  content: string;
  documentId?: string;
  status: NoticeStatus;
  createdAt: string;
  updatedAt: string;
}

export type RentalNoticeInput = {
  leaseId?: string;
  rentalPropertyId?: string;
  recipientCustomerId?: string;
  recipientType: NoticeRecipientType;
  noticeType: NoticeType;
  effectiveDate?: string;
  content: string;
};

// ---------------------------------------------------------------------
// Lease renewals (section 21)
// ---------------------------------------------------------------------
export type RenewalStatus = "REQUESTED" | "TERMS_PROPOSED" | "APPROVED" | "SIGNED" | "REJECTED" | "CANCELLED";
export const renewalStatuses: RenewalStatus[] = ["REQUESTED", "TERMS_PROPOSED", "APPROVED", "SIGNED", "REJECTED", "CANCELLED"];

export const LEASE_RENEWAL_ALLOWED_TRANSITIONS: Record<RenewalStatus, RenewalStatus[]> = {
  REQUESTED: ["TERMS_PROPOSED", "CANCELLED"],
  TERMS_PROPOSED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["SIGNED", "CANCELLED"],
  SIGNED: [],
  REJECTED: [],
  CANCELLED: [],
};

export interface LeaseRenewal {
  id: string;
  leaseId: string;
  leaseNumber?: string;
  oldRent: number;
  newRent: number;
  oldEndDate: string;
  newEndDate: string;
  changePercent?: number;
  effectiveDate: string;
  status: RenewalStatus;
  requestedByName?: string;
  requestedByCustomerId?: string;
  approvedByName?: string;
  approvedAt?: string;
  newLeaseDocumentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeaseRenewalInput = {
  newRent: number;
  newEndDate: string;
  effectiveDate: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// Move records (sections 23-24) — unifies move-in/move-out.
// ---------------------------------------------------------------------
export type MoveRecordType = "MOVE_IN" | "MOVE_OUT";
export const moveRecordTypes: MoveRecordType[] = ["MOVE_IN", "MOVE_OUT"];

export type MoveRecordStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export const moveRecordStatuses: MoveRecordStatus[] = ["IN_PROGRESS", "COMPLETED", "CANCELLED"];

export interface RentalMoveRecord {
  id: string;
  leaseId: string;
  recordType: MoveRecordType;
  scheduledDate?: string;
  completedDate?: string;
  inspectionId?: string;
  depositReceived: boolean;
  documentsCompleted: boolean;
  keysHandedOver: boolean;
  tenantConfirmed: boolean;
  tenantConfirmedAt?: string;
  outstandingRentCleared: boolean;
  utilitiesSettled: boolean;
  noticeId?: string;
  status: MoveRecordStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RentalMoveRecordInput = {
  scheduledDate?: string;
  notes?: string;
};

// ---------------------------------------------------------------------
// Landlord statements (section 30)
// ---------------------------------------------------------------------
export type LandlordStatementStatus = "DRAFT" | "FINALIZED";
export const landlordStatementStatuses: LandlordStatementStatus[] = ["DRAFT", "FINALIZED"];

export interface LandlordStatement {
  id: string;
  statementNumber: string;
  landlordId: string;
  landlordName?: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  rentCollected: number;
  otherIncome: number;
  maintenanceExpenses: number;
  managementFees: number;
  otherExpenses: number;
  adjustments: number;
  netAmount: number;
  closingBalance: number;
  status: LandlordStatementStatus;
  generatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type LandlordStatementGenerateInput = {
  landlordId: string;
  periodStart: string;
  periodEnd: string;
  otherIncome?: number;
  otherExpenses?: number;
  adjustments?: number;
};

// ---------------------------------------------------------------------
// Work order landlord approval (section 27, additive on
// maintenance_work_orders)
// ---------------------------------------------------------------------
export type WorkOrderLandlordApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
export const workOrderLandlordApprovalStatuses: WorkOrderLandlordApprovalStatus[] = ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"];

// ---------------------------------------------------------------------
// Settings (singleton)
// ---------------------------------------------------------------------
export interface RentalSettings {
  defaultGracePeriodDays: number;
  defaultLateFeeType: LateFeeType;
  defaultLateFeeValue: number;
  leaseExpiryReminderDays: number[];
  rentDueReminderDaysBefore: number;
  currency: string;
  updatedAt: string;
}

export type RentalSettingsInput = Partial<Omit<RentalSettings, "updatedAt">>;

// ---------------------------------------------------------------------
// Dashboard / reports
// ---------------------------------------------------------------------
export interface RentalDashboardStats {
  totalRentalProperties: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeLeases: number;
  expiringLeases: number;
  rentDue: number;
  rentCollected: number;
  outstandingRent: number;
  overdueRent: number;
  securityDepositsHeld: number;
  openMaintenanceRequests: number;
  monthlyRentalIncome: number;
  monthlyRentalExpenses: number;
  netRentalIncome: number;
}

export interface OccupancySummary {
  totalUnits: number;
  occupied: number;
  vacant: number;
  unavailable: number;
  occupancyRatePercent: number | null;
}

export interface RentCollectionRate {
  totalDue: number;
  confirmedCollected: number;
  collectionRatePercent: number | null;
  periodFrom: string;
  periodTo: string;
}

export interface PropertyRentalPerformance {
  rentalPropertyId: string;
  propertyTitle: string;
  currentTenantName: string | null;
  leaseStatus: LeaseStatus | null;
  monthlyRent: number | null;
  outstandingAmount: number;
  openMaintenanceRequests: number;
  nextLeaseExpiry: string | null;
}

/** Section 32 — ESTIMATE vs ACTUAL always distinguished; integrates
 *  with the STEP 24 investment intelligence estimatedGrossYield shape. */
export interface RentalProfitability {
  rentalPropertyId: string;
  grossRentalIncomeActual: number;
  propertyExpensesActual: number;
  managementFeesActual: number;
  maintenanceActual: number;
  netRentalIncomeActual: number;
  occupancyRatePercent: number | null;
  estimatedAnnualRent: number | null;
  estimatedRentalYieldPercent: number | null;
}
