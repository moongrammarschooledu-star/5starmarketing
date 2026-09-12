import "server-only";
import { createClient } from "@/lib/supabase/server";
import { propertyService, TYPE_TO_DB, TYPE_FROM_DB } from "./propertyService";
import { valuationSettingsService } from "./valuationSettingsService";
import { investmentAuditService } from "./investmentAuditService";
import { toSquareFeet, pricePerSqft, calculateConfidenceScore, distanceKm } from "@/lib/investment/calculations";
import type { PropertyValuation, PropertyValuationInput, ValuationComparable, ValuationDifference } from "@/lib/models/investment";

const SELECT = "*, properties(title), projects(name), admin_profiles(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyValuation {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    valuationMethod: row.valuation_method,
    basePrice: Number(row.base_price),
    area: Number(row.area),
    areaUnit: row.area_unit,
    normalizedAreaSqft: Number(row.normalized_area_sqft),
    location: row.location ?? undefined,
    propertyType: row.property_type ?? undefined,
    condition: row.condition ?? undefined,
    ageYears: row.age_years ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    floor: row.floor ?? undefined,
    amenities: row.amenities ?? undefined,
    rentalEstimateMonthly: row.rental_estimate_monthly != null ? Number(row.rental_estimate_monthly) : undefined,
    occupancyRate: row.occupancy_rate != null ? Number(row.occupancy_rate) : undefined,
    expenseAssumptions: row.expense_assumptions ?? undefined,
    marketAdjustmentPercent: row.market_adjustment_percent != null ? Number(row.market_adjustment_percent) : undefined,
    finalEstimatedValue: Number(row.final_estimated_value),
    confidenceScore: row.confidence_score,
    confidenceFactors: row.confidence_factors ?? undefined,
    assumptions: row.assumptions ?? undefined,
    valuationDate: row.valuation_date,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    version: row.version,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComparableRow(row: any): ValuationComparable {
  return {
    id: row.id,
    valuationId: row.valuation_id,
    comparablePropertyId: row.comparable_property_id ?? undefined,
    comparableDealId: row.comparable_deal_id ?? undefined,
    isTransaction: !!row.is_transaction,
    title: row.title ?? undefined,
    location: row.location ?? undefined,
    price: Number(row.price),
    areaSqft: row.area_sqft != null ? Number(row.area_sqft) : undefined,
    pricePerSqft: row.price_per_sqft != null ? Number(row.price_per_sqft) : undefined,
    propertyType: row.property_type ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    transactionDate: row.transaction_date ?? undefined,
    similarityScore: row.similarity_score != null ? Number(row.similarity_score) : undefined,
    approved: !!row.approved,
    approvedBy: row.approved_by ?? undefined,
    createdAt: row.created_at,
  };
}

export interface ComparableCandidate {
  propertyId?: string;
  dealId?: string;
  isTransaction: boolean;
  title: string;
  location?: string;
  price: number;
  areaSqft?: number;
  pricePerSqft?: number;
  propertyType?: string;
  bedrooms?: number;
  transactionDate?: string;
  similarityScore: number;
}

export const propertyValuationService = {
  /** Admin index (section 3) — most recent valuations across all
   *  properties, newest first. */
  async listRecent(limit = 50): Promise<PropertyValuation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_valuations").select(SELECT).order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getLatestForProperty(propertyId: string): Promise<PropertyValuation | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_valuations").select(SELECT).eq("property_id", propertyId).order("version", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listHistory(propertyId: string): Promise<PropertyValuation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_valuations").select(SELECT).eq("property_id", propertyId).order("version", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** Section 21 — Previous/New/Difference/% Change between consecutive
   *  versions, computed from the real immutable rows (never a second
   *  "diff" table). */
  async listDifferences(propertyId: string): Promise<ValuationDifference[]> {
    const history = await this.listHistory(propertyId); // newest first
    return history.map((v, i) => {
      const previous = history[i + 1];
      const difference = previous ? v.finalEstimatedValue - previous.finalEstimatedValue : undefined;
      const percentChange = previous && previous.finalEstimatedValue > 0 ? (difference! / previous.finalEstimatedValue) * 100 : undefined;
      return {
        previousValue: previous?.finalEstimatedValue,
        newValue: v.finalEstimatedValue,
        difference,
        percentChange,
        method: v.valuationMethod,
        date: v.valuationDate,
        createdByName: v.createdByName,
        version: v.version,
      };
    });
  },

  async getById(id: string): Promise<PropertyValuation | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_valuations").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async listComparables(valuationId: string, approvedOnly = false): Promise<ValuationComparable[]> {
    const supabase = await createClient();
    let query = supabase.from("valuation_comparables").select("*").eq("valuation_id", valuationId).order("similarity_score", { ascending: false });
    if (approvedOnly) query = query.eq("approved", true);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapComparableRow);
  },

  /** Section 6 — finds REAL candidate comparables from actual
   *  properties (asking price) and actual completed deals (confirmed
   *  transaction price). Never invents a comparable; a candidate the
   *  admin doesn't approve is simply discarded (never persisted). */
  async findComparableCandidates(propertyId: string, limit = 15): Promise<ComparableCandidate[]> {
    const property = await propertyService.getById(propertyId);
    if (!property) return [];
    const supabase = await createClient();

    const dbType = TYPE_TO_DB[property.type];
    const [{ data: askingRows }, { data: dealRows }] = await Promise.all([
      supabase
        .from("properties")
        .select("id, title, location, location_area, price_value, size_sqft, property_type, bedrooms, latitude, longitude")
        .eq("property_type", dbType)
        .neq("id", propertyId)
        .not("price_value", "is", null)
        .limit(100),
      supabase
        .from("deals")
        .select("id, final_amount, completed_at, property_id, properties(title, location, location_area, size_sqft, property_type, bedrooms, latitude, longitude)")
        .eq("status", "Completed")
        .not("completed_at", "is", null)
        .not("property_id", "is", null)
        .limit(100),
    ]);

    const candidates: ComparableCandidate[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (askingRows ?? []) as any[]) {
      const areaSqft = row.size_sqft != null ? Number(row.size_sqft) : undefined;
      const friendlyType = TYPE_FROM_DB[row.property_type] ?? row.property_type;
      const score = similarityScore(property, { locationArea: row.location_area, type: friendlyType, bedrooms: row.bedrooms, sizeSqft: areaSqft, latitude: row.latitude, longitude: row.longitude });
      candidates.push({
        propertyId: row.id,
        isTransaction: false,
        title: row.title,
        location: row.location,
        price: Number(row.price_value),
        areaSqft,
        pricePerSqft: pricePerSqft(Number(row.price_value), areaSqft) ?? undefined,
        propertyType: friendlyType,
        bedrooms: row.bedrooms ?? undefined,
        similarityScore: score,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (dealRows ?? []) as any[]) {
      const p = row.properties;
      if (!p || row.property_id === propertyId) continue;
      const areaSqft = p.size_sqft != null ? Number(p.size_sqft) : undefined;
      if (p.property_type !== dbType) continue;
      const friendlyType = TYPE_FROM_DB[p.property_type] ?? p.property_type;
      const score = similarityScore(property, { locationArea: p.location_area, type: friendlyType, bedrooms: p.bedrooms, sizeSqft: areaSqft, latitude: p.latitude, longitude: p.longitude });
      candidates.push({
        dealId: row.id,
        isTransaction: true,
        title: p.title,
        location: p.location,
        price: Number(row.final_amount),
        areaSqft,
        pricePerSqft: pricePerSqft(Number(row.final_amount), areaSqft) ?? undefined,
        propertyType: friendlyType,
        bedrooms: p.bedrooms ?? undefined,
        transactionDate: row.completed_at ? String(row.completed_at).slice(0, 10) : undefined,
        similarityScore: score,
      });
    }

    return candidates.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);
  },

  /** Creates a NEW version (never overwrites — section 21). Comparables
   *  are attached in the same call since the row is immutable
   *  thereafter, and confidence scoring needs the real comparable count
   *  at creation time. */
  async create(input: PropertyValuationInput, chosenComparables: ComparableCandidate[], actorId: string, actorName: string): Promise<PropertyValuation> {
    const property = await propertyService.getById(input.propertyId);
    if (!property) throw new Error("Property not found.");
    const settings = await valuationSettingsService.get();

    const normalizedAreaSqft = toSquareFeet(input.area, input.areaUnit, settings);
    if (!normalizedAreaSqft) throw new Error("Please enter a valid area.");

    const finalEstimatedValue = input.finalEstimatedValue ?? input.basePrice * (1 + (input.marketAdjustmentPercent ?? 0) / 100);
    if (!Number.isFinite(finalEstimatedValue) || finalEstimatedValue < 0) throw new Error("Could not determine a valid estimated value.");

    const supabase = await createClient();
    const { data: existing } = await supabase.from("property_valuations").select("version").eq("property_id", input.propertyId).order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (existing?.version ?? 0) + 1;

    const { data: marketDataRows } = await supabase.from("market_data").select("data_date").eq("status", "VERIFIED").order("data_date", { ascending: false }).limit(1);
    const hasVerifiedMarketData = (marketDataRows?.length ?? 0) > 0;
    const marketDataAgeMonths = hasVerifiedMarketData ? Math.round((Date.now() - new Date(marketDataRows![0].data_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) : undefined;

    const completeness = [property.sizeSqft, property.priceValue, property.bedrooms, property.latitude].filter((v) => v != null).length;
    const { level, factors } = calculateConfidenceScore({
      comparablesCount: chosenComparables.length,
      hasVerifiedMarketData,
      marketDataAgeMonths,
      hasConfirmedTransactionComparable: chosenComparables.some((c) => c.isTransaction),
      hasRentalData: !!input.rentalEstimateMonthly,
      propertyDataCompleteness: (completeness / 4) * 100,
      settings,
    });

    const { data, error } = await supabase
      .from("property_valuations")
      .insert({
        property_id: input.propertyId,
        project_id: property.projectId || null,
        valuation_method: input.valuationMethod,
        base_price: input.basePrice,
        area: input.area,
        area_unit: input.areaUnit,
        normalized_area_sqft: normalizedAreaSqft,
        location: property.location,
        property_type: property.type,
        condition: input.condition || null,
        age_years: input.ageYears ?? null,
        bedrooms: property.bedrooms ?? null,
        bathrooms: property.bathrooms ?? null,
        floor: input.floor ?? null,
        amenities: input.amenities ?? null,
        rental_estimate_monthly: input.rentalEstimateMonthly ?? null,
        occupancy_rate: input.occupancyRate ?? null,
        expense_assumptions: input.expenseAssumptions ?? null,
        market_adjustment_percent: input.marketAdjustmentPercent ?? null,
        final_estimated_value: finalEstimatedValue,
        confidence_score: level,
        confidence_factors: factors,
        assumptions: input.assumptions || null,
        created_by: actorId,
        version: nextVersion,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("propertyValuationService.create failed:", error);
      throw new Error("Could not create this valuation.");
    }

    if (chosenComparables.length > 0) {
      await supabase.from("valuation_comparables").insert(
        chosenComparables.map((c) => ({
          valuation_id: data.id,
          comparable_property_id: c.propertyId || null,
          comparable_deal_id: c.dealId || null,
          is_transaction: c.isTransaction,
          title: c.title,
          location: c.location || null,
          price: c.price,
          area_sqft: c.areaSqft ?? null,
          price_per_sqft: c.pricePerSqft ?? null,
          property_type: c.propertyType || null,
          bedrooms: c.bedrooms ?? null,
          transaction_date: c.transactionDate || null,
          similarity_score: c.similarityScore,
          approved: false,
        }))
      );
    }

    const valuation = mapRow(data);
    await investmentAuditService.log({ entityType: "valuation", entityId: valuation.id, action: "Created", actorId, actorName, newValue: { propertyId: input.propertyId, version: nextVersion, finalEstimatedValue } });
    return valuation;
  },

  async approveComparable(comparableId: string, actorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("valuation_comparables").update({ approved: true, approved_by: actorId }).eq("id", comparableId);
    if (error) throw new Error("Could not approve this comparable.");
  },

  async unapproveComparable(comparableId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("valuation_comparables").update({ approved: false, approved_by: null }).eq("id", comparableId);
    if (error) throw new Error("Could not update this comparable.");
  },
};

function similarityScore(
  subject: { locationArea: string; type: string; bedrooms?: number; latitude?: number; longitude?: number; sizeSqft?: number },
  candidate: { locationArea?: string; type?: string; bedrooms?: number; sizeSqft?: number; latitude?: number; longitude?: number }
): number {
  let score = 0;
  if (candidate.locationArea && candidate.locationArea === subject.locationArea) score += 40;
  if (candidate.type && candidate.type === subject.type) score += 25;
  if (subject.bedrooms != null && candidate.bedrooms != null) {
    if (candidate.bedrooms === subject.bedrooms) score += 15;
    else if (Math.abs(candidate.bedrooms - subject.bedrooms) === 1) score += 7;
  }
  if (subject.sizeSqft && candidate.sizeSqft) {
    const ratio = Math.min(subject.sizeSqft, candidate.sizeSqft) / Math.max(subject.sizeSqft, candidate.sizeSqft);
    if (ratio >= 0.8) score += 15;
    else if (ratio >= 0.6) score += 7;
  }
  if (subject.latitude != null && subject.longitude != null && candidate.latitude != null && candidate.longitude != null) {
    const km = distanceKm(subject.latitude, subject.longitude, candidate.latitude, candidate.longitude);
    if (km <= 2) score += 10;
    else if (km <= 5) score += 5;
  }
  return Math.min(100, score);
}
