// ---------------------------------------------------------------------
// Pure, side-effect-free investment/valuation math (sections 4-5, 8-14,
// 20). Every function validates its inputs — no division by zero, no
// silent NaN/Infinity, no fabricated numbers. Nothing here talks to the
// database; callers pass in real, already-fetched values.
// ---------------------------------------------------------------------
import type { AreaUnit, ValuationSettings, ExpenseAssumptions, ConfidenceLevel } from "@/lib/models/investment";

// ---- Area normalization (section 4) ----

/** Converts `area` in `unit` to square feet, using the admin-configured
 *  factors in ValuationSettings — never a hardcoded local convention. */
export function toSquareFeet(area: number, unit: AreaUnit, settings: Pick<ValuationSettings, "sqftPerSqyd" | "sqftPerMarla" | "sqftPerKanal" | "sqftPerAcre">): number | null {
  if (!Number.isFinite(area) || area <= 0) return null;
  switch (unit) {
    case "Sq Ft":
      return area;
    case "Sq Yd":
      return area * settings.sqftPerSqyd;
    case "Marla":
      return area * settings.sqftPerMarla;
    case "Kanal":
      return area * settings.sqftPerKanal;
    case "Acre":
      return area * settings.sqftPerAcre;
    default:
      return null;
  }
}

export function fromSquareFeet(areaSqft: number, unit: AreaUnit, settings: Pick<ValuationSettings, "sqftPerSqyd" | "sqftPerMarla" | "sqftPerKanal" | "sqftPerAcre">): number | null {
  if (!Number.isFinite(areaSqft) || areaSqft <= 0) return null;
  switch (unit) {
    case "Sq Ft":
      return areaSqft;
    case "Sq Yd":
      return settings.sqftPerSqyd > 0 ? areaSqft / settings.sqftPerSqyd : null;
    case "Marla":
      return settings.sqftPerMarla > 0 ? areaSqft / settings.sqftPerMarla : null;
    case "Kanal":
      return settings.sqftPerKanal > 0 ? areaSqft / settings.sqftPerKanal : null;
    case "Acre":
      return settings.sqftPerAcre > 0 ? areaSqft / settings.sqftPerAcre : null;
    default:
      return null;
  }
}

// ---- Price per area (section 5) — never divides by zero ----

export function pricePerSqft(price: number, areaSqft: number | null | undefined): number | null {
  if (!Number.isFinite(price) || price < 0 || !areaSqft || areaSqft <= 0) return null;
  return price / areaSqft;
}

export function pricePerUnit(price: number, area: number | null | undefined, unit: AreaUnit, settings: Pick<ValuationSettings, "sqftPerSqyd" | "sqftPerMarla" | "sqftPerKanal" | "sqftPerAcre">): number | null {
  if (!Number.isFinite(price) || price < 0 || !area || area <= 0) return null;
  const sqft = toSquareFeet(area, "Sq Ft" === unit ? "Sq Ft" : unit, settings);
  if (!sqft) return null;
  const perSqft = pricePerSqft(price, sqft);
  if (perSqft == null) return null;
  const oneUnitInSqft = toSquareFeet(1, unit, settings);
  if (!oneUnitInSqft) return null;
  return perSqft * oneUnitInSqft;
}

// ---- Rental yield (section 8) ----

export interface RentalYieldResult {
  annualGrossRent: number;
  annualNetRent: number;
  grossYieldPercent: number | null;
  netYieldPercent: number | null;
}

export function calculateRentalYield(
  purchasePrice: number,
  monthlyRent: number,
  expenses: Partial<ExpenseAssumptions> = {}
): RentalYieldResult {
  const annualGrossRent = Math.max(0, monthlyRent) * 12;
  const vacancyLoss = annualGrossRent * (Math.max(0, expenses.vacancyRate ?? 0) / 100);
  const maintenanceCost = annualGrossRent * (Math.max(0, expenses.maintenanceRate ?? 0) / 100);
  const managementFee = annualGrossRent * (Math.max(0, expenses.managementFeeRate ?? 0) / 100);
  const other = Math.max(0, expenses.otherAnnualExpenses ?? 0);
  const annualNetRent = Math.max(0, annualGrossRent - vacancyLoss - maintenanceCost - managementFee - other);

  const grossYieldPercent = purchasePrice > 0 ? (annualGrossRent / purchasePrice) * 100 : null;
  const netYieldPercent = purchasePrice > 0 ? (annualNetRent / purchasePrice) * 100 : null;

  return { annualGrossRent, annualNetRent, grossYieldPercent, netYieldPercent };
}

// ---- Appreciation projection (section 10) ----

export interface AppreciationYear {
  year: number;
  projectedValue: number;
}

/** future_value = current_value * (1 + annual_rate)^years — the admin/
 *  user-provided rate is never invented (section 10). */
export function projectAppreciation(currentValue: number, annualRatePercent: number, horizonYears: number): AppreciationYear[] {
  if (!Number.isFinite(currentValue) || currentValue <= 0 || horizonYears <= 0) return [];
  const rate = annualRatePercent / 100;
  const milestones = [1, 2, 3, 5, 10].filter((y) => y <= horizonYears);
  if (!milestones.includes(horizonYears)) milestones.push(horizonYears);
  return [...new Set(milestones)].sort((a, b) => a - b).map((year) => ({ year, projectedValue: currentValue * Math.pow(1 + rate, year) }));
}

// ---- ROI (section 9) ----

export interface RoiInput {
  purchasePrice: number;
  acquisitionCosts?: number;
  renovationCosts?: number;
  otherInvestmentCosts?: number;
  projectedExitValue: number;
  projectedRentalIncomeTotal: number;
  exitCostsPercent?: number;
}

export interface RoiResult {
  totalInvestment: number;
  netExitValue: number;
  estimatedGain: number;
  estimatedRoiPercent: number | null;
}

export function calculateRoi(input: RoiInput): RoiResult {
  const totalInvestment = Math.max(0, input.purchasePrice) + Math.max(0, input.acquisitionCosts ?? 0) + Math.max(0, input.renovationCosts ?? 0) + Math.max(0, input.otherInvestmentCosts ?? 0);
  const exitCosts = Math.max(0, input.projectedExitValue) * (Math.max(0, input.exitCostsPercent ?? 0) / 100);
  const netExitValue = Math.max(0, input.projectedExitValue) - exitCosts;
  const estimatedGain = netExitValue + Math.max(0, input.projectedRentalIncomeTotal) - totalInvestment;
  const estimatedRoiPercent = totalInvestment > 0 ? (estimatedGain / totalInvestment) * 100 : null;
  return { totalInvestment, netExitValue, estimatedGain, estimatedRoiPercent };
}

// ---- Financing (section 12) — never assumes a rate ----

export interface LoanInput {
  loanAmount?: number;
  interestRatePercent?: number;
  loanTermYears?: number;
}

export function calculateMonthlyLoanPayment(loan: LoanInput): { monthlyPayment: number | null; note?: string } {
  if (loan.loanAmount == null || loan.interestRatePercent == null || loan.loanTermYears == null) {
    return { monthlyPayment: null, note: "Financing assumptions not provided." };
  }
  if (loan.loanAmount <= 0 || loan.loanTermYears <= 0) return { monthlyPayment: null, note: "Financing assumptions not provided." };
  const monthlyRate = loan.interestRatePercent / 100 / 12;
  const numPayments = loan.loanTermYears * 12;
  if (monthlyRate === 0) return { monthlyPayment: loan.loanAmount / numPayments };
  const payment = (loan.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return { monthlyPayment: payment };
}

// ---- Cash flow projection (section 11) ----

export interface CashFlowYearInput {
  yearNumber: number;
  propertyValue: number;
  monthlyRent: number;
  expenses: Partial<ExpenseAssumptions>;
  annualDebtService?: number;
}

export function buildCashFlowYear(input: CashFlowYearInput, cumulativeSoFar: number): { grossRentalIncome: number; expenses: number; netCashFlow: number; cumulativeCashFlow: number; projectedPropertyValue: number } {
  const { annualGrossRent, annualNetRent } = calculateRentalYield(input.propertyValue, input.monthlyRent, input.expenses);
  const debtService = Math.max(0, input.annualDebtService ?? 0);
  const netCashFlow = annualNetRent - debtService;
  const cumulativeCashFlow = cumulativeSoFar + netCashFlow;
  const totalExpenses = annualGrossRent - annualNetRent + debtService;
  return { grossRentalIncome: annualGrossRent, expenses: totalExpenses, netCashFlow, cumulativeCashFlow, projectedPropertyValue: input.propertyValue };
}

// ---- Annualized return / XIRR (sections 14) ----

export interface DatedCashFlow {
  date: string; // ISO date
  amount: number; // negative = outflow, positive = inflow
}

/** Newton-Raphson XIRR solver. Returns null (with a reason) whenever
 *  the inputs are insufficient — never fabricates an annualized return
 *  from incomplete data (section 14's explicit requirement). */
export function calculateAnnualizedReturn(cashFlows: DatedCashFlow[]): { rate: number | null; note?: string } {
  const valid = cashFlows.filter((cf) => cf.date && Number.isFinite(cf.amount));
  if (valid.length < 2) return { rate: null, note: "Annualized return cannot be calculated from the available cash-flow data." };
  const hasInflow = valid.some((cf) => cf.amount > 0);
  const hasOutflow = valid.some((cf) => cf.amount < 0);
  if (!hasInflow || !hasOutflow) return { rate: null, note: "Annualized return cannot be calculated from the available cash-flow data." };

  const sorted = [...valid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const t0 = new Date(sorted[0].date).getTime();
  const years = sorted.map((cf) => (new Date(cf.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25));

  const npv = (rate: number) => sorted.reduce((sum, cf, i) => sum + cf.amount / Math.pow(1 + rate, years[i]), 0);
  const npvDerivative = (rate: number) => sorted.reduce((sum, cf, i) => (years[i] === 0 ? sum : sum - (years[i] * cf.amount) / Math.pow(1 + rate, years[i] + 1)), 0);

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const derivative = npvDerivative(rate);
    if (Math.abs(derivative) < 1e-10) break;
    const nextRate = rate - value / derivative;
    if (!Number.isFinite(nextRate)) return { rate: null, note: "Annualized return cannot be calculated from the available cash-flow data." };
    if (Math.abs(nextRate - rate) < 1e-7) {
      rate = nextRate;
      break;
    }
    rate = nextRate;
  }
  if (!Number.isFinite(rate) || rate < -0.99 || rate > 100) return { rate: null, note: "Annualized return cannot be calculated from the available cash-flow data." };
  return { rate: rate * 100 };
}

// ---- Confidence score (section 20) ----

export interface ConfidenceInputs {
  comparablesCount: number;
  hasVerifiedMarketData: boolean;
  marketDataAgeMonths?: number;
  hasConfirmedTransactionComparable: boolean;
  hasRentalData: boolean;
  propertyDataCompleteness: number; // 0-100
  settings: Pick<ValuationSettings, "minComparablesForHigh" | "minComparablesForMedium" | "maxMarketDataAgeMonthsForHigh">;
}

export function calculateConfidenceScore(input: ConfidenceInputs): { level: ConfidenceLevel; factors: string[] } {
  const factors: string[] = [];
  let points = 0;

  if (input.comparablesCount >= input.settings.minComparablesForHigh) {
    points += 2;
    factors.push(`${input.comparablesCount} comparable properties available`);
  } else if (input.comparablesCount >= input.settings.minComparablesForMedium) {
    points += 1;
    factors.push(`${input.comparablesCount} comparable properties available (limited)`);
  } else {
    factors.push(`Only ${input.comparablesCount} comparable properties available`);
  }

  if (input.hasVerifiedMarketData) {
    points += 1;
    factors.push("Verified market data available");
    if (input.marketDataAgeMonths != null && input.marketDataAgeMonths <= input.settings.maxMarketDataAgeMonthsForHigh) {
      points += 1;
      factors.push("Market data is recent");
    } else if (input.marketDataAgeMonths != null) {
      factors.push("Market data is dated");
    }
  } else {
    factors.push("No verified market data available");
  }

  if (input.hasConfirmedTransactionComparable) {
    points += 1;
    factors.push("Includes confirmed transaction comparable(s)");
  } else {
    factors.push("No confirmed transaction comparables — asking prices only");
  }

  if (input.hasRentalData) {
    points += 1;
    factors.push("Rental data available");
  } else {
    factors.push("No rental data available");
  }

  if (input.propertyDataCompleteness >= 80) {
    points += 1;
    factors.push("Property data is complete");
  } else {
    factors.push("Property data is incomplete");
  }

  const level: ConfidenceLevel = points >= 5 ? "HIGH" : points >= 3 ? "MEDIUM" : "LOW";
  return { level, factors };
}

// ---- Distance (Haversine, for location-based comparable matching) ----

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
