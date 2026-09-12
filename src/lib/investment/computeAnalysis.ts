// Pure orchestration of the calculation engine (no "server-only" — used
// by both the server (investmentAnalysisService, saving a result) and
// client components (live recompute as a user adjusts inputs) so the
// exact same formulas run in both places, never two implementations
// that could silently drift apart.
import { calculateRentalYield, calculateRoi, projectAppreciation, calculateMonthlyLoanPayment, buildCashFlowYear, calculateAnnualizedReturn } from "./calculations";
import type { InvestmentInputs, InvestmentResults, InvestmentCashFlowYear } from "@/lib/models/investment";

export function computeInvestmentResults(inputs: InvestmentInputs): { results: InvestmentResults; cashFlows: InvestmentCashFlowYear[] } {
  const rental = calculateRentalYield(inputs.purchasePrice, inputs.rentalEstimateMonthly ?? 0, {
    vacancyRate: inputs.vacancyRate,
    maintenanceRate: inputs.maintenanceRate,
    managementFeeRate: inputs.managementFeeRate,
    otherAnnualExpenses: (inputs.propertyTaxAnnual ?? 0) + (inputs.otherAnnualExpenses ?? 0),
  });

  const appreciationRate = inputs.annualAppreciationRatePercent ?? 0;
  const appreciationYears = projectAppreciation(inputs.purchasePrice, appreciationRate, inputs.investmentHorizonYears);
  const exitYear = appreciationYears.find((y) => y.year === inputs.investmentHorizonYears);
  const projectedExitValue = exitYear?.projectedValue ?? inputs.purchasePrice;

  const financing = calculateMonthlyLoanPayment({
    loanAmount: inputs.financing?.loanAmount,
    interestRatePercent: inputs.financing?.interestRatePercent,
    loanTermYears: inputs.financing?.loanTermYears,
  });
  const annualDebtService = financing.monthlyPayment ? financing.monthlyPayment * 12 : 0;

  const cashFlows: InvestmentCashFlowYear[] = [];
  let cumulative = 0;
  for (let year = 1; year <= inputs.investmentHorizonYears; year++) {
    const propertyValueThisYear = inputs.purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    const built = buildCashFlowYear(
      { yearNumber: year, propertyValue: propertyValueThisYear, monthlyRent: inputs.rentalEstimateMonthly ?? 0, expenses: { vacancyRate: inputs.vacancyRate, maintenanceRate: inputs.maintenanceRate, managementFeeRate: inputs.managementFeeRate, otherAnnualExpenses: (inputs.propertyTaxAnnual ?? 0) + (inputs.otherAnnualExpenses ?? 0) }, annualDebtService },
      cumulative
    );
    cumulative = built.cumulativeCashFlow;
    cashFlows.push({ yearNumber: year, grossRentalIncome: built.grossRentalIncome, expenses: built.expenses, netCashFlow: built.netCashFlow, cumulativeCashFlow: built.cumulativeCashFlow, projectedPropertyValue: built.projectedPropertyValue });
  }
  const netRentalIncomeTotal = cashFlows.reduce((sum, y) => sum + y.netCashFlow, 0);

  const roi = calculateRoi({
    purchasePrice: inputs.purchasePrice,
    acquisitionCosts: inputs.acquisitionCosts,
    renovationCosts: inputs.renovationCosts,
    otherInvestmentCosts: inputs.otherInvestmentCosts,
    projectedExitValue,
    projectedRentalIncomeTotal: netRentalIncomeTotal,
    exitCostsPercent: inputs.exitCostsPercent,
  });

  const datedFlows = [
    { date: new Date().toISOString().slice(0, 10), amount: -roi.totalInvestment },
    ...cashFlows.map((y, i) => ({ date: new Date(Date.now() + (i + 1) * 365.25 * 86400000).toISOString().slice(0, 10), amount: y.netCashFlow })),
    { date: new Date(Date.now() + inputs.investmentHorizonYears * 365.25 * 86400000).toISOString().slice(0, 10), amount: roi.netExitValue },
  ];
  const annualized = calculateAnnualizedReturn(datedFlows);

  const results: InvestmentResults = {
    totalInvestment: roi.totalInvestment,
    annualGrossRent: rental.annualGrossRent,
    annualNetRent: rental.annualNetRent,
    grossRentalYieldPercent: rental.grossYieldPercent ?? 0,
    netRentalYieldPercent: rental.netYieldPercent ?? 0,
    projectedExitValue,
    projectedRentalIncomeTotal: netRentalIncomeTotal,
    estimatedGain: roi.estimatedGain,
    estimatedRoiPercent: roi.estimatedRoiPercent ?? 0,
    annualizedReturnPercent: annualized.rate ?? undefined,
    annualizedReturnNote: annualized.note,
    financingNote: financing.note,
    monthlyLoanPayment: financing.monthlyPayment ?? undefined,
  };

  return { results, cashFlows };
}
