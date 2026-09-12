"use server";

import { revalidatePath } from "next/cache";
import { propertyValuationService, type ComparableCandidate } from "@/services/propertyValuationService";
import { marketDataService } from "@/services/marketDataService";
import { investmentAnalysisService } from "@/services/investmentAnalysisService";
import { investmentAlertService } from "@/services/investmentAlertService";
import { investmentScenarioService } from "@/services/investmentScenarioService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { investmentEventService } from "@/services/investmentEventService";
import { leadService } from "@/services/leadService";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { propertyService } from "@/services/propertyService";
import { canAccess, canManageFinance } from "@/lib/permissions";
import { isRateLimited } from "@/lib/rateLimit";
import { pricePerSqft } from "@/lib/investment/calculations";
import { headers } from "next/headers";
import type { PropertyValuationInput, MarketDataInput, MarketDataStatus, InvestmentAnalysisInput, InvestmentAlertInput, InvestmentScenarioInput, ValuationSettingsInput, InvestmentEventInput } from "@/lib/models/investment";
import type { LeadType } from "@/lib/models/lead";

async function requireInvestmentAccess() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "investment")) throw new Error("Not authorized.");
  return admin;
}

async function requireInvestmentManageAccess() {
  const admin = await requireInvestmentAccess();
  if (!canManageFinance(admin.role)) throw new Error("Not authorized for this action.");
  return admin;
}

function revalidateAll(propertyId?: string, projectId?: string) {
  revalidatePath("/admin/investment");
  revalidatePath("/admin/investment/dashboard");
  revalidatePath("/admin/investment/valuation");
  revalidatePath("/admin/investment/market-data");
  if (propertyId) revalidatePath(`/properties/${propertyId}/investment`);
  if (projectId) revalidatePath(`/projects/${projectId}/investment`);
}

// ---- Valuations ----

export async function createValuationAction(input: PropertyValuationInput, comparables: ComparableCandidate[]) {
  const admin = await requireInvestmentManageAccess();
  const valuation = await propertyValuationService.create(input, comparables, admin.id, admin.name);
  revalidateAll(input.propertyId);
  return valuation;
}

export async function findComparableCandidatesAction(propertyId: string): Promise<ComparableCandidate[]> {
  await requireInvestmentManageAccess();
  return propertyValuationService.findComparableCandidates(propertyId);
}

export async function approveComparableAction(comparableId: string, propertyId?: string) {
  const admin = await requireInvestmentManageAccess();
  await propertyValuationService.approveComparable(comparableId, admin.id);
  revalidateAll(propertyId);
}

export async function unapproveComparableAction(comparableId: string, propertyId?: string) {
  await requireInvestmentManageAccess();
  await propertyValuationService.unapproveComparable(comparableId);
  revalidateAll(propertyId);
}

// ---- Market data ----

export async function createMarketDataAction(input: MarketDataInput) {
  const admin = await requireInvestmentManageAccess();
  const record = await marketDataService.create(input, admin.id, admin.name);
  revalidatePath("/admin/investment/market-data");
  return record;
}

export async function updateMarketDataAction(id: string, input: Partial<MarketDataInput>) {
  const admin = await requireInvestmentManageAccess();
  await marketDataService.update(id, input, admin.id, admin.name);
  revalidatePath("/admin/investment/market-data");
}

export async function setMarketDataStatusAction(id: string, status: MarketDataStatus) {
  const admin = await requireInvestmentManageAccess();
  await marketDataService.setStatus(id, status, admin.id, admin.name);
  revalidatePath("/admin/investment/market-data");
}

// ---- Investment scenarios ----

export async function createScenarioAction(input: InvestmentScenarioInput) {
  await requireInvestmentManageAccess();
  const scenario = await investmentScenarioService.create(input);
  revalidateAll();
  return scenario;
}

export async function updateScenarioAction(id: string, input: Partial<InvestmentScenarioInput>) {
  await requireInvestmentManageAccess();
  await investmentScenarioService.update(id, input);
  revalidateAll();
}

export async function removeScenarioAction(id: string) {
  await requireInvestmentManageAccess();
  await investmentScenarioService.remove(id);
  revalidateAll();
}

// ---- Settings ----

export async function updateValuationSettingsAction(input: ValuationSettingsInput) {
  await requireInvestmentManageAccess();
  await valuationSettingsService.update(input);
  revalidatePath("/admin/investment/settings");
}

// ---- Investment analyses (saved analyses — admin OR customer) ----

export async function createAnalysisAction(input: InvestmentAnalysisInput) {
  const customer = await customerService.getCurrentCustomer();
  if (customer) {
    const analysis = await investmentAnalysisService.create(input, { customerId: customer.id });
    await investmentEventService.track({ eventType: "analysis_saved", propertyId: input.propertyId, projectId: input.projectId }, customer.id);
    revalidatePath("/customer/investments");
    return analysis;
  }
  const admin = await profileService.getCurrentAdmin();
  if (admin && canAccess(admin.role, "investment")) {
    const analysis = await investmentAnalysisService.create(input, { adminId: admin.id }, admin.name);
    revalidateAll(input.propertyId, input.projectId);
    return analysis;
  }
  throw new Error("Not authorized.");
}

async function requireOwnAnalysis(id: string) {
  const analysis = await investmentAnalysisService.getById(id);
  if (!analysis) throw new Error("Analysis not found.");
  const customer = await customerService.getCurrentCustomer();
  if (customer && analysis.customerId === customer.id) return analysis;
  const admin = await profileService.getCurrentAdmin();
  if (admin && canAccess(admin.role, "investment")) return analysis;
  throw new Error("Not authorized.");
}

export async function renameAnalysisAction(id: string, name: string) {
  await requireOwnAnalysis(id);
  await investmentAnalysisService.rename(id, name);
  revalidatePath("/customer/investments");
}

export async function removeAnalysisAction(id: string) {
  await requireOwnAnalysis(id);
  await investmentAnalysisService.remove(id);
  revalidatePath("/customer/investments");
}

export async function duplicateAnalysisAction(id: string, newName: string) {
  const existing = await requireOwnAnalysis(id);
  const customer = await customerService.getCurrentCustomer();
  const owner = customer && existing.customerId === customer.id ? { customerId: customer.id } : {};
  const duplicate = await investmentAnalysisService.duplicate(id, newName, owner);
  revalidatePath("/customer/investments");
  return duplicate;
}

// ---- Investment alerts (customer-owned) ----

async function requireCustomer() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new Error("Not signed in.");
  return customer;
}

export async function createAlertAction(input: InvestmentAlertInput) {
  const customer = await requireCustomer();
  const alert = await investmentAlertService.create(customer.id, input);
  revalidatePath("/customer/investments");
  return alert;
}

export async function setAlertActiveAction(id: string, active: boolean) {
  await requireCustomer();
  await investmentAlertService.setActive(id, active);
  revalidatePath("/customer/investments");
}

export async function removeAlertAction(id: string) {
  await requireCustomer();
  await investmentAlertService.remove(id);
  revalidatePath("/customer/investments");
}

// ---- CRM integration (section 24) ----

const INVESTMENT_ACTION_TO_LEAD_TYPE: Record<string, LeadType> = {
  "Request Investment Analysis": "Investment Inquiry",
  "Request Property Consultation": "General Inquiry",
  "Request Site Visit": "Site Visit",
  "Contact Agent": "Callback Request",
  "Request Payment Plan": "Payment Plan Request",
};

export async function createInvestmentLeadAction(input: {
  name: string;
  phone: string;
  email?: string;
  propertyId?: string;
  projectId?: string;
  action: keyof typeof INVESTMENT_ACTION_TO_LEAD_TYPE;
  message?: string;
  budgetMin?: number;
  budgetMax?: number;
  investmentHorizonYears?: number;
  preferredLocation?: string;
  consent: boolean;
  /** Honeypot — a hidden field real visitors never fill in; matches
   *  PropertyInquiryForm/api/contact's existing bot-defense pattern. */
  company?: string;
}) {
  if (input.company?.trim()) return; // bot — silently accept, never save
  if (!input.name.trim() || !input.phone.trim()) throw new Error("Please provide your name and phone number.");
  if (!/^[0-9+()\-\s]{7,20}$/.test(input.phone.trim())) throw new Error("Please enter a valid phone number.");
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Please enter a valid email address.");
  if (!input.consent) throw new Error("Please agree to be contacted regarding this property.");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`investment-lead:${ip}`, 60_000, 5)) throw new Error("Too many submissions. Please try again in a minute.");

  await leadService.create({
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email,
    propertyId: input.propertyId,
    projectId: input.projectId,
    message: input.message || `${input.action}${input.investmentHorizonYears ? ` — ${input.investmentHorizonYears}-year horizon` : ""}`,
    source: "Property Page",
    leadType: INVESTMENT_ACTION_TO_LEAD_TYPE[input.action],
    consent: input.consent,
    purpose: "Invest",
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    preferredLocation: input.preferredLocation,
  });
  await investmentEventService.track({ eventType: "investment_lead_created", propertyId: input.propertyId, projectId: input.projectId });
}

// ---- Property comparison (section 17) — extends the existing
// localStorage-based /compare page with investment metrics; never a
// separate comparison page/selector, per property.slug conventions. ----

export interface InvestmentComparisonRow {
  propertyId: string;
  pricePerSqft: number | null;
  pricePerMarla: number | null;
  estimatedValue: number | null;
  confidenceScore: string | null;
  grossRentalYieldPercent: number | null;
}

export async function getInvestmentComparisonAction(propertyIds: string[]): Promise<InvestmentComparisonRow[]> {
  const settings = await valuationSettingsService.get();

  return Promise.all(
    propertyIds.map(async (propertyId) => {
      const [property, latestValuation] = await Promise.all([propertyService.getById(propertyId), propertyValuationService.getLatestForProperty(propertyId)]);
      const areaSqft = property?.sizeSqft ?? latestValuation?.normalizedAreaSqft;
      const perSqft = property?.priceValue && areaSqft ? pricePerSqft(property.priceValue, areaSqft) : null;
      const perMarla = perSqft != null ? perSqft * settings.sqftPerMarla : null;
      const grossYield = latestValuation?.rentalEstimateMonthly && latestValuation.finalEstimatedValue > 0 ? ((latestValuation.rentalEstimateMonthly * 12) / latestValuation.finalEstimatedValue) * 100 : null;
      return {
        propertyId,
        pricePerSqft: perSqft,
        pricePerMarla: perMarla,
        estimatedValue: latestValuation?.finalEstimatedValue ?? null,
        confidenceScore: latestValuation?.confidenceScore ?? null,
        grossRentalYieldPercent: grossYield,
      };
    })
  );
}

// ---- Analytics events (section 35) — public, no auth required ----

export async function trackInvestmentEventAction(input: InvestmentEventInput) {
  const customer = await customerService.getCurrentCustomer().catch(() => null);
  await investmentEventService.track(input, customer?.id);
}
