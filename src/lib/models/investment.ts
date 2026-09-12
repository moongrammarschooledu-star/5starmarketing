// ---------------------------------------------------------------------
// Property Valuation & Investment Intelligence (new module).
//
// Terminology discipline throughout this file (spec sections 31-32):
// every projected figure is an ESTIMATE, never a guarantee; every
// comparable is explicitly ASKING or CONFIRMED TRANSACTION, never
// blended silently.
// ---------------------------------------------------------------------

export type AreaUnit = "Sq Ft" | "Sq Yd" | "Marla" | "Kanal" | "Acre";
export const areaUnits: AreaUnit[] = ["Sq Ft", "Sq Yd", "Marla", "Kanal", "Acre"];

export interface ValuationSettings {
  sqftPerSqyd: number;
  sqftPerMarla: number;
  sqftPerKanal: number;
  sqftPerAcre: number;
  minComparablesForHigh: number;
  minComparablesForMedium: number;
  maxMarketDataAgeMonthsForHigh: number;
  defaultVacancyRate: number;
  defaultMaintenanceRate: number;
  defaultManagementFeeRate: number;
  defaultInvestmentHorizonYears: number;
  currency: string;
  disclaimerText: string;
  updatedAt: string;
}

export type ValuationSettingsInput = Partial<Omit<ValuationSettings, "updatedAt">>;

export const DEFAULT_INVESTMENT_DISCLAIMER =
  "Investment calculations, valuations, market comparisons and projected returns are estimates based on the information and assumptions provided. They are not guarantees of future performance and do not constitute financial, legal, tax or professional valuation advice. Actual property values, rental income, expenses, market conditions and investment returns may differ. Users should obtain appropriate professional advice before making investment decisions.";

// ---------------------------------------------------------------------
// Investment scenarios (admin-configurable rate presets — section 27)
// ---------------------------------------------------------------------
export interface InvestmentScenario {
  id: string;
  name: string;
  annualAppreciationRate: number;
  isDefault: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentScenarioInput = Pick<InvestmentScenario, "name" | "annualAppreciationRate" | "isDefault" | "sortOrder" | "active">;

// ---------------------------------------------------------------------
// Property valuations (sections 3, 21) — append-only, versioned per
// property; there is no separate "valuation_versions" table — each row
// here IS one immutable version (never overwritten), so the full
// history is simply every row for a given property_id ordered by
// version. This avoids a second table that could drift out of sync.
// ---------------------------------------------------------------------
export type ValuationMethod = "COMPARABLE_SALES" | "INCOME_APPROACH" | "COST_APPROACH" | "MANUAL" | "DCF";
export const valuationMethods: ValuationMethod[] = ["COMPARABLE_SALES", "INCOME_APPROACH", "COST_APPROACH", "MANUAL", "DCF"];

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export const confidenceLevels: ConfidenceLevel[] = ["HIGH", "MEDIUM", "LOW"];

export interface ExpenseAssumptions {
  vacancyRate: number;
  maintenanceRate: number;
  managementFeeRate: number;
  otherAnnualExpenses: number;
}

export interface PropertyValuation {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  valuationMethod: ValuationMethod;
  basePrice: number;
  area: number;
  areaUnit: AreaUnit;
  normalizedAreaSqft: number;
  location?: string;
  propertyType?: string;
  condition?: string;
  ageYears?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  amenities?: string[];
  rentalEstimateMonthly?: number;
  occupancyRate?: number;
  expenseAssumptions?: ExpenseAssumptions;
  marketAdjustmentPercent?: number;
  finalEstimatedValue: number;
  confidenceScore: ConfidenceLevel;
  confidenceFactors?: string[];
  assumptions?: string;
  valuationDate: string;
  createdBy?: string;
  createdByName?: string;
  version: number;
  createdAt: string;
}

export interface PropertyValuationInput {
  propertyId: string;
  valuationMethod: ValuationMethod;
  basePrice: number;
  area: number;
  areaUnit: AreaUnit;
  condition?: string;
  ageYears?: number;
  floor?: number;
  amenities?: string[];
  rentalEstimateMonthly?: number;
  occupancyRate?: number;
  expenseAssumptions?: Partial<ExpenseAssumptions>;
  marketAdjustmentPercent?: number;
  finalEstimatedValue?: number;
  assumptions?: string;
}

export interface ValuationDifference {
  previousValue?: number;
  newValue: number;
  difference?: number;
  percentChange?: number;
  method: ValuationMethod;
  date: string;
  createdByName?: string;
  version: number;
}

// ---------------------------------------------------------------------
// Comparable properties (section 6) — sourced ONLY from real
// properties (asking price) or real completed deals (confirmed
// transaction price); never invented.
// ---------------------------------------------------------------------
export interface ValuationComparable {
  id: string;
  valuationId: string;
  comparablePropertyId?: string;
  comparableDealId?: string;
  isTransaction: boolean;
  title?: string;
  location?: string;
  price: number;
  areaSqft?: number;
  pricePerSqft?: number;
  propertyType?: string;
  bedrooms?: number;
  transactionDate?: string;
  similarityScore?: number;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Market data (section 7) — admin-managed, DRAFT/VERIFIED/ARCHIVED.
// Only VERIFIED rows feed official market-intelligence figures.
// ---------------------------------------------------------------------
export type MarketDataStatus = "DRAFT" | "VERIFIED" | "ARCHIVED";
export const marketDataStatuses: MarketDataStatus[] = ["DRAFT", "VERIFIED", "ARCHIVED"];

export interface MarketData {
  id: string;
  location: string;
  propertyType?: string;
  periodStart?: string;
  periodEnd?: string;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  pricePerMarla?: number;
  pricePerSqft?: number;
  averageRent?: number;
  rentalYield?: number;
  appreciationRate?: number;
  dataSource?: string;
  sourceUrl?: string;
  dataDate: string;
  status: MarketDataStatus;
  confidenceLevel?: ConfidenceLevel;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MarketDataInput = Pick<
  MarketData,
  | "location"
  | "propertyType"
  | "periodStart"
  | "periodEnd"
  | "averagePrice"
  | "minPrice"
  | "maxPrice"
  | "pricePerMarla"
  | "pricePerSqft"
  | "averageRent"
  | "rentalYield"
  | "appreciationRate"
  | "dataSource"
  | "sourceUrl"
  | "dataDate"
  | "confidenceLevel"
  | "notes"
>;

// ---------------------------------------------------------------------
// Investment analyses (sections 9-14, 18) — a saved/computed analysis.
// This table serves BOTH the "run a scenario" computation AND the
// "Investor Saved Analysis" concept from section 18 — a customer's own
// saved analysis IS one of these rows (customer_id identifies
// ownership); there is no separate "saved_investments" table, which
// would only duplicate identical columns.
// ---------------------------------------------------------------------
export interface FinancingInputs {
  loanAmount?: number;
  interestRatePercent?: number;
  loanTermYears?: number;
}

export interface InvestmentInputs {
  purchasePrice: number;
  acquisitionCosts?: number;
  renovationCosts?: number;
  otherInvestmentCosts?: number;
  downPayment?: number;
  rentalEstimateMonthly?: number;
  vacancyRate?: number;
  maintenanceRate?: number;
  managementFeeRate?: number;
  propertyTaxAnnual?: number;
  otherAnnualExpenses?: number;
  exitCostsPercent?: number;
  investmentHorizonYears: number;
  scenarioId?: string;
  annualAppreciationRatePercent?: number;
  financing?: FinancingInputs;
}

export interface InvestmentResults {
  totalInvestment: number;
  annualGrossRent: number;
  annualNetRent: number;
  grossRentalYieldPercent: number;
  netRentalYieldPercent: number;
  projectedExitValue: number;
  projectedRentalIncomeTotal: number;
  estimatedGain: number;
  estimatedRoiPercent: number;
  annualizedReturnPercent?: number;
  annualizedReturnNote?: string;
  financingNote?: string;
  monthlyLoanPayment?: number;
}

export interface InvestmentAnalysis {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  customerId?: string;
  createdBy?: string;
  createdByName?: string;
  name: string;
  scenarioName?: string;
  inputs: InvestmentInputs;
  results: InvestmentResults;
  cashFlows?: InvestmentCashFlowYear[];
  createdAt: string;
  updatedAt: string;
}

export type InvestmentAnalysisInput = {
  propertyId?: string;
  projectId?: string;
  name: string;
  scenarioName?: string;
  inputs: InvestmentInputs;
};

export interface InvestmentCashFlowYear {
  yearNumber: number;
  grossRentalIncome: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  projectedPropertyValue: number;
}

// ---------------------------------------------------------------------
// Investment alerts (section 23)
// ---------------------------------------------------------------------
export type InvestmentAlertType = "PRICE_BELOW" | "YIELD_ABOVE" | "ROI_ABOVE" | "AVAILABILITY" | "INVENTORY_CHANGE" | "PRICE_CHANGE";
export const investmentAlertTypes: InvestmentAlertType[] = ["PRICE_BELOW", "YIELD_ABOVE", "ROI_ABOVE", "AVAILABILITY", "INVENTORY_CHANGE", "PRICE_CHANGE"];

export interface InvestmentAlert {
  id: string;
  customerId: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectName?: string;
  alertType: InvestmentAlertType;
  thresholdValue?: number;
  active: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export type InvestmentAlertInput = Pick<InvestmentAlert, "propertyId" | "projectId" | "alertType" | "thresholdValue">;

// ---------------------------------------------------------------------
// Property price history (section 22) — distinct from STEP19's
// inventory_price_history (unit-level within a project); this tracks
// the PROPERTY listing itself plus deal-linked booking/transaction
// prices, clearly labeled.
// ---------------------------------------------------------------------
export type PropertyPriceType = "LISTING" | "UPDATED" | "BOOKING" | "TRANSACTION";
export const propertyPriceTypes: PropertyPriceType[] = ["LISTING", "UPDATED", "BOOKING", "TRANSACTION"];

export interface PropertyPriceHistoryEntry {
  id: string;
  propertyId: string;
  priceType: PropertyPriceType;
  price: number;
  source?: string;
  dealId?: string;
  recordedAt: string;
  createdByName?: string;
}

// ---------------------------------------------------------------------
// Analytics events (section 35) — mirrors search_events' dedicated,
// closed-enum-per-feature convention rather than one generic table.
// ---------------------------------------------------------------------
export type InvestmentEventType =
  | "page_view"
  | "calculator_used"
  | "valuation_requested"
  | "report_downloaded"
  | "property_compared"
  | "investment_lead_created"
  | "analysis_saved"
  | "consultation_requested";

export interface InvestmentEventInput {
  eventType: InvestmentEventType;
  propertyId?: string;
  projectId?: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

// ---------------------------------------------------------------------
// Audit log (section 36) — mirrors financial_audit_logs exactly.
// ---------------------------------------------------------------------
export interface InvestmentAuditLogEntry {
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
// Dashboard (section 2)
// ---------------------------------------------------------------------
export interface ProjectInvestmentSummary {
  projectId: string;
  projectName: string;
  totalInventory: number;
  availableUnits: number;
  soldUnits: number;
  reservedUnits: number;
  bookedUnits: number;
  averagePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  averagePricePerMarla: number | null;
  averagePricePerSqft: number | null;
}

export interface InvestmentDashboardStats {
  totalPropertiesAnalyzed: number;
  totalValuationReports: number;
  averagePricePerMarla: number | null;
  averagePricePerSqft: number | null;
  averageRentalYield: number | null;
  averageEstimatedAppreciation: number | null;
  strongInvestmentCount: number;
  savedAnalysesCount: number;
  marketDataUpdatesCount: number;
}

// ---------------------------------------------------------------------
// Dashboard trend charts (section 2) — every series is derived only
// from real property_valuations / investment_analyses / investment_scenarios
// rows; a month with no data is simply omitted, never interpolated.
// ---------------------------------------------------------------------
export interface TrendPoint {
  date: string;
  count: number;
}

export interface InvestmentDashboardTrends {
  pricePerSqftTrend: TrendPoint[];
  pricePerMarlaTrend: TrendPoint[];
  rentalYieldTrend: TrendPoint[];
  performanceProjectionTrend: TrendPoint[];
}
