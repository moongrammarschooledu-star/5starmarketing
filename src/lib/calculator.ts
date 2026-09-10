// Pure, dependency-free calculation helpers shared by the public payment
// calculator, the investment calculator, and the admin payment-plan
// preview. Every result is clearly an ESTIMATE — see the disclaimer
// constants below, used verbatim everywhere a calculated figure appears.

import type { InstallmentFrequency } from "./models/paymentPlan";

export const PAYMENT_DISCLAIMER =
  "Payment figures shown are estimates for informational purposes only. Please contact 5STAR.M Estate & Builders for the confirmed price and official payment schedule.";

export const INVESTMENT_DISCLAIMER =
  "This is an estimate only and does not guarantee future property returns or profits.";

/** Rounds to the nearest whole rupee — real-estate figures in PKR are
 *  never quoted with paisa, and rounding at each boundary (rather than
 *  truncating or compounding raw floating-point division) keeps the
 *  numbers exact instead of drifting by fractions of a rupee. */
export function roundRupees(value: number): number {
  return Math.round(value);
}

/** "Rs. 5,000,000" — the exact format given in the STEP 12 spec. */
export function formatPKR(value: number): string {
  return `Rs. ${roundRupees(value).toLocaleString("en-US")}`;
}

export interface PaymentCalculationInput {
  propertyPrice: number;
  downPayment: number;
  duration: number;
  frequency: InstallmentFrequency;
}

export interface PaymentCalculationResult {
  remainingAmount: number;
  installmentAmount: number;
  totalPayments: number;
  totalPayment: number;
}

export function validatePaymentInput(input: PaymentCalculationInput): string | null {
  if (!(input.propertyPrice > 0)) return "Property price must be greater than zero.";
  if (input.downPayment < 0) return "Down payment cannot be negative.";
  if (input.downPayment > input.propertyPrice) return "Down payment cannot be greater than property price.";
  if (!(input.duration > 0)) return "Payment duration must be greater than zero.";
  return null;
}

/** Simple, interest-free equal-installment plan — exactly the formula
 *  from STEP 12 section 2: Remaining Amount ÷ Number of Periods. */
export function calculatePaymentPlan(input: PaymentCalculationInput): PaymentCalculationResult {
  const remainingAmount = roundRupees(input.propertyPrice - input.downPayment);
  const installmentAmount = roundRupees(remainingAmount / input.duration);
  const totalPayment = roundRupees(input.downPayment + installmentAmount * input.duration);
  return {
    remainingAmount,
    installmentAmount,
    totalPayments: input.duration,
    totalPayment,
  };
}

export interface InvestmentCalculationInput {
  purchasePrice: number;
  initialInvestment: number;
  expectedSellingPrice: number;
  holdingPeriod: number;
  holdingPeriodUnit: "Months" | "Years";
}

export interface InvestmentCalculationResult {
  estimatedGain: number;
  estimatedReturnPercent: number;
}

export function validateInvestmentInput(input: InvestmentCalculationInput): string | null {
  if (!(input.purchasePrice > 0)) return "Purchase price must be greater than zero.";
  if (!(input.initialInvestment > 0)) return "Initial investment must be greater than zero.";
  if (input.expectedSellingPrice < 0) return "Expected selling price cannot be negative.";
  if (!(input.holdingPeriod > 0)) return "Holding period must be greater than zero.";
  return null;
}

/** Estimated Gain = Expected Selling Price − Purchase Price.
 *  Estimated Return % = Estimated Gain ÷ Initial Investment × 100
 *  — exactly the formulas from STEP 12 section 9. Not annualized. */
export function calculateInvestment(input: InvestmentCalculationInput): InvestmentCalculationResult {
  const estimatedGain = roundRupees(input.expectedSellingPrice - input.purchasePrice);
  const estimatedReturnPercent = Math.round((estimatedGain / input.initialInvestment) * 10000) / 100;
  return { estimatedGain, estimatedReturnPercent };
}
