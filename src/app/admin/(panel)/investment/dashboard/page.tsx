import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { investmentReportService } from "@/services/investmentReportService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";

export const dynamic = "force-dynamic";

export default async function InvestmentDashboardPage() {
  await requireSection("investment");
  const [stats, trends, appreciationChart, settings] = await Promise.all([
    investmentReportService.dashboardStats(),
    investmentReportService.dashboardTrends(),
    investmentReportService.appreciationScenarioChart(),
    valuationSettingsService.get(),
  ]);

  return (
    <div>
      <Link href="/admin/investment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Investment
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink">Investment Intelligence Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Every figure below is computed from real, saved valuations and analyses — never fabricated.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Properties Analyzed" value={String(stats.totalPropertiesAnalyzed)} />
        <StatCard label="Avg. Price / Sqft" value={stats.averagePricePerSqft != null ? formatPKR(stats.averagePricePerSqft) : "Insufficient data"} />
        <StatCard label="Avg. Price / Marla" value={stats.averagePricePerMarla != null ? formatPKR(stats.averagePricePerMarla) : "Insufficient data"} />
        <StatCard label="Avg. Rental Yield" value={stats.averageRentalYield != null ? `${stats.averageRentalYield.toFixed(2)}%` : "Insufficient data"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TrendChart title="Price per Sqft Trend (avg., by month)" data={trends.pricePerSqftTrend} empty="Insufficient verified data for this analysis." />
        <TrendChart title="Price per Marla Trend (avg., by month)" data={trends.pricePerMarlaTrend} empty="Insufficient verified data for this analysis." />
        <TrendChart title="Rental Yield Trend (gross, avg. %, by month)" data={trends.rentalYieldTrend} empty="Insufficient verified data for this analysis." />
        <TrendChart title="Investment Performance Projections (avg. estimated ROI %, by month saved)" data={trends.performanceProjectionTrend} empty="Insufficient verified data for this analysis." />
        <div className="lg:col-span-2">
          <CountBucketChart
            title={`Estimated Appreciation Scenarios (projected value at ${settings.defaultInvestmentHorizonYears}-year horizon, from avg. current portfolio value)`}
            data={appreciationChart}
            empty="Insufficient verified data for this analysis — create at least one valuation and an active scenario first."
          />
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> All trend and appreciation figures are ESTIMATES derived from saved valuations, saved analyses, and admin-configured scenario rates. {settings.disclaimerText}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-lg font-extrabold text-ink">{value}</p>
    </div>
  );
}
