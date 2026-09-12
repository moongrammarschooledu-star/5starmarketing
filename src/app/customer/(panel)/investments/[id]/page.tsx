import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { customerService } from "@/services/customerService";
import { investmentAnalysisService } from "@/services/investmentAnalysisService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { formatPKR } from "@/lib/calculator";

export const metadata = { title: "Investment Analysis" };
export const dynamic = "force-dynamic";

export default async function CustomerInvestmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const [analysis, settings] = await Promise.all([investmentAnalysisService.getById(id), valuationSettingsService.get()]);
  if (!analysis || analysis.customerId !== customer.id) notFound();

  return (
    <div>
      <Link href="/customer/investments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Investments
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{analysis.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {analysis.propertyTitle || "Custom analysis"} {analysis.scenarioName ? `· ${analysis.scenarioName} scenario` : ""} · Saved {new Date(analysis.createdAt).toLocaleDateString("en-GB")}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total Investment" value={formatPKR(analysis.results.totalInvestment)} />
        <Metric label="Gross Yield" value={`${analysis.results.grossRentalYieldPercent.toFixed(2)}%`} />
        <Metric label="Net Yield" value={`${analysis.results.netRentalYieldPercent.toFixed(2)}%`} />
        <Metric label="Estimated ROI" value={`${analysis.results.estimatedRoiPercent.toFixed(2)}%`} accent />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Projected Exit Value" value={formatPKR(analysis.results.projectedExitValue)} small />
        <Metric label="Estimated Gain" value={formatPKR(analysis.results.estimatedGain)} small />
        <Metric label="Annualized Return" value={analysis.results.annualizedReturnPercent != null ? `${analysis.results.annualizedReturnPercent.toFixed(2)}%` : analysis.results.annualizedReturnNote ?? "—"} small />
      </div>

      {analysis.cashFlows && analysis.cashFlows.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-ink">Cash Flow Projection</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Gross Rental Income</th>
                  <th className="px-4 py-3">Expenses</th>
                  <th className="px-4 py-3">Net Cash Flow</th>
                  <th className="px-4 py-3">Cumulative</th>
                  <th className="px-4 py-3">Projected Value</th>
                </tr>
              </thead>
              <tbody>
                {analysis.cashFlows.map((y) => (
                  <tr key={y.yearNumber} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">Year {y.yearNumber}</td>
                    <td className="px-4 py-3 text-muted">{formatPKR(y.grossRentalIncome)}</td>
                    <td className="px-4 py-3 text-muted">{formatPKR(y.expenses)}</td>
                    <td className="px-4 py-3 text-ink">{formatPKR(y.netCashFlow)}</td>
                    <td className="px-4 py-3 text-muted">{formatPKR(y.cumulativeCashFlow)}</td>
                    <td className="px-4 py-3 text-muted">{formatPKR(y.projectedPropertyValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> {settings.disclaimerText}
      </p>
    </div>
  );
}

function Metric({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading ${small ? "text-base" : "text-lg"} font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
