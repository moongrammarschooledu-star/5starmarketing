import "server-only";
import { createClient } from "@/lib/supabase/server";
import { inventoryService } from "./inventoryService";
import { valuationSettingsService } from "./valuationSettingsService";
import { investmentScenarioService } from "./investmentScenarioService";
import { toSquareFeet, pricePerSqft, projectAppreciation } from "@/lib/investment/calculations";
import type { InvestmentDashboardStats, InvestmentDashboardTrends, ProjectInvestmentSummary, TrendPoint } from "@/lib/models/investment";
import type { AreaUnit } from "@/lib/models/investment";
import type { CountBucket } from "@/lib/models/analytics";

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function averageByMonth(rows: { createdAt: string; value: number }[]): TrendPoint[] {
  const buckets = new Map<string, { label: string; sum: number; n: number }>();
  for (const row of rows) {
    const key = monthKey(row.createdAt);
    const existing = buckets.get(key);
    if (existing) {
      existing.sum += row.value;
      existing.n += 1;
    } else {
      buckets.set(key, { label: monthLabel(row.createdAt), sum: row.value, n: 1 });
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => ({ date: v.label, count: Math.round((v.sum / v.n) * 100) / 100 }));
}

export const investmentReportService = {
  /** Section 2 — every figure computed from real rows; averages are
   *  omitted (null) rather than shown as 0 when there is no data yet. */
  async dashboardStats(): Promise<InvestmentDashboardStats> {
    const supabase = await createClient();
    const [{ data: valuations }, { count: savedCount }, { count: marketDataCount }] = await Promise.all([
      supabase.from("property_valuations").select("property_id, final_estimated_value, normalized_area_sqft, rental_estimate_monthly").order("version", { ascending: false }),
      supabase.from("investment_analyses").select("id", { count: "exact", head: true }),
      supabase.from("market_data").select("id", { count: "exact", head: true }).eq("status", "VERIFIED").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const settings = await valuationSettingsService.get();
    // Only the latest version per property counts toward averages.
    const latestByProperty = new Map<string, { finalEstimatedValue: number; normalizedAreaSqft: number; rentalEstimateMonthly?: number }>();
    for (const row of valuations ?? []) {
      if (!latestByProperty.has(row.property_id)) {
        latestByProperty.set(row.property_id, { finalEstimatedValue: Number(row.final_estimated_value), normalizedAreaSqft: Number(row.normalized_area_sqft), rentalEstimateMonthly: row.rental_estimate_monthly != null ? Number(row.rental_estimate_monthly) : undefined });
      }
    }
    const latest = [...latestByProperty.values()];
    const totalPropertiesAnalyzed = latest.length;
    const totalValuationReports = valuations?.length ?? 0;

    const pricesPerMarla = latest.map((v) => pricePerSqft(v.finalEstimatedValue, v.normalizedAreaSqft)).filter((v): v is number => v != null).map((perSqft) => perSqft * settings.sqftPerMarla);
    const pricesPerSqft = latest.map((v) => pricePerSqft(v.finalEstimatedValue, v.normalizedAreaSqft)).filter((v): v is number => v != null);
    const yields = latest.filter((v) => v.rentalEstimateMonthly).map((v) => ((v.rentalEstimateMonthly! * 12) / v.finalEstimatedValue) * 100);

    const average = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const strongInvestmentCount = yields.filter((y) => y >= 6).length;

    return {
      totalPropertiesAnalyzed,
      totalValuationReports,
      averagePricePerMarla: average(pricesPerMarla),
      averagePricePerSqft: average(pricesPerSqft),
      averageRentalYield: average(yields),
      averageEstimatedAppreciation: null, // requires a chosen scenario to project — shown per-property, not averaged blindly here
      strongInvestmentCount,
      savedAnalysesCount: savedCount ?? 0,
      marketDataUpdatesCount: marketDataCount ?? 0,
    };
  },

  /** Section 15 — reuses inventoryService's own project-level
   *  aggregation rather than re-deriving it. */
  async projectInvestmentSummary(projectId: string): Promise<ProjectInvestmentSummary> {
    const [summaries, units, settings] = await Promise.all([inventoryService.projectSummaries(), inventoryService.listByProject(projectId), valuationSettingsService.get()]);
    const summary = summaries.find((s) => s.projectId === projectId);

    const pricedUnits = units.filter((u) => u.price != null && u.price > 0);
    const prices = pricedUnits.map((u) => u.price!);
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    const pricePerSqftValues = pricedUnits
      .map((u) => {
        if (!u.area || !u.areaUnit) return null;
        const sqft = toSquareFeet(u.area, u.areaUnit as AreaUnit, settings);
        return sqft ? pricePerSqft(u.price!, sqft) : null;
      })
      .filter((v): v is number => v != null);
    const averagePricePerSqft = pricePerSqftValues.length > 0 ? pricePerSqftValues.reduce((a, b) => a + b, 0) / pricePerSqftValues.length : null;
    const averagePricePerMarla = averagePricePerSqft != null ? averagePricePerSqft * settings.sqftPerMarla : null;

    return {
      projectId,
      projectName: summary?.projectName ?? "Project",
      totalInventory: summary?.total ?? 0,
      availableUnits: summary?.available ?? 0,
      soldUnits: summary?.sold ?? 0,
      reservedUnits: summary?.reserved ?? 0,
      bookedUnits: summary?.booked ?? 0,
      averagePrice,
      minPrice,
      maxPrice,
      averagePricePerMarla,
      averagePricePerSqft,
    };
  },

  /** Section 2 dashboard trend charts — real data only; a chart with
   *  no qualifying rows comes back as an empty array so the page can
   *  show "Insufficient verified data" instead of a fake/empty chart. */
  async dashboardTrends(): Promise<InvestmentDashboardTrends> {
    const supabase = await createClient();
    const [{ data: valuations }, { data: analyses }, settings] = await Promise.all([
      supabase.from("property_valuations").select("created_at, final_estimated_value, normalized_area_sqft, rental_estimate_monthly").order("created_at", { ascending: true }),
      supabase.from("investment_analyses").select("created_at, results").order("created_at", { ascending: true }),
      valuationSettingsService.get(),
    ]);

    const pricePerSqftRows = (valuations ?? [])
      .map((v) => {
        const perSqft = pricePerSqft(Number(v.final_estimated_value), Number(v.normalized_area_sqft));
        return perSqft != null ? { createdAt: v.created_at as string, value: perSqft } : null;
      })
      .filter((r): r is { createdAt: string; value: number } => r != null);
    const pricePerMarlaRows = pricePerSqftRows.map((r) => ({ createdAt: r.createdAt, value: r.value * settings.sqftPerMarla }));

    const yieldRows = (valuations ?? [])
      .filter((v) => v.rental_estimate_monthly != null && Number(v.final_estimated_value) > 0)
      .map((v) => ({ createdAt: v.created_at as string, value: ((Number(v.rental_estimate_monthly) * 12) / Number(v.final_estimated_value)) * 100 }));

    const performanceRows = (analyses ?? [])
      .map((a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = a.results as any;
        const roi = results?.estimatedRoiPercent;
        return typeof roi === "number" && Number.isFinite(roi) ? { createdAt: a.created_at as string, value: roi } : null;
      })
      .filter((r): r is { createdAt: string; value: number } => r != null);

    return {
      pricePerSqftTrend: averageByMonth(pricePerSqftRows),
      pricePerMarlaTrend: averageByMonth(pricePerMarlaRows),
      rentalYieldTrend: averageByMonth(yieldRows),
      performanceProjectionTrend: averageByMonth(performanceRows),
    };
  },

  /** Section 10 — appreciation scenarios projected from the real
   *  portfolio average current value using admin-configured scenario
   *  rates; clearly an ESTIMATE, never a guaranteed return. Returns []
   *  when there isn't yet a real current value to project from. */
  async appreciationScenarioChart(): Promise<CountBucket[]> {
    const [{ data: valuations }, scenarios, settings] = await Promise.all([
      (await createClient()).from("property_valuations").select("property_id, final_estimated_value, version").order("version", { ascending: false }),
      investmentScenarioService.list(true),
      valuationSettingsService.get(),
    ]);
    if (!valuations || valuations.length === 0 || scenarios.length === 0) return [];

    const latestByProperty = new Map<string, number>();
    for (const row of valuations) {
      if (!latestByProperty.has(row.property_id)) latestByProperty.set(row.property_id, Number(row.final_estimated_value));
    }
    const values = [...latestByProperty.values()];
    const averageCurrentValue = values.reduce((a, b) => a + b, 0) / values.length;
    if (!(averageCurrentValue > 0)) return [];

    const horizon = settings.defaultInvestmentHorizonYears;
    return scenarios
      .map((s) => {
        const years = projectAppreciation(averageCurrentValue, s.annualAppreciationRate, horizon);
        const atHorizon = years.find((y) => y.year === horizon) ?? years[years.length - 1];
        return atHorizon ? { label: `${s.name} (est.)`, count: Math.round(atHorizon.projectedValue) } : null;
      })
      .filter((b): b is CountBucket => b != null);
  },
};
