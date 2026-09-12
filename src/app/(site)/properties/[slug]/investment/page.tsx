import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { propertyValuationService } from "@/services/propertyValuationService";
import { investmentScenarioService } from "@/services/investmentScenarioService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { customerService } from "@/services/customerService";
import { pricePerSqft } from "@/lib/investment/calculations";
import { PropertyInvestmentAnalyzer } from "@/components/investment/PropertyInvestmentAnalyzer";
import { InvestmentCrmActions } from "@/components/investment/InvestmentCrmActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await propertyService.getBySlug(slug);
  if (!property) return { title: "Property Not Found" };
  return { title: `Investment Analysis — ${property.title}`, robots: { index: false } };
}

export default async function PropertyInvestmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await propertyService.getBySlug(slug);
  if (!property) notFound();

  const [settings, scenarios, latestValuation, customer] = await Promise.all([
    valuationSettingsService.get(),
    investmentScenarioService.list(true),
    propertyValuationService.getLatestForProperty(property.id),
    customerService.getCurrentCustomer().catch(() => null),
  ]);

  const comparables = latestValuation ? await propertyValuationService.listComparables(latestValuation.id, true) : [];

  const areaSqft = property.sizeSqft ?? (latestValuation ? latestValuation.normalizedAreaSqft : undefined);
  const pricePerSqftValue = property.priceValue && areaSqft ? pricePerSqft(property.priceValue, areaSqft) : null;
  const pricePerMarlaValue = pricePerSqftValue != null ? pricePerSqftValue * settings.sqftPerMarla : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/properties/${property.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {property.title}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink sm:text-3xl">Investment Analysis</h1>
      <p className="mt-1 text-sm text-muted">{property.title} — {property.location}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current Price" value={property.priceValue ? formatPKR(property.priceValue) : "Data unavailable"} />
        <Stat label="Area" value={property.size} />
        <Stat label="Price per Marla" value={pricePerMarlaValue != null ? formatPKR(pricePerMarlaValue) : "Data unavailable"} />
        <Stat label="Price per Sq Ft" value={pricePerSqftValue != null ? formatPKR(pricePerSqftValue) : "Data unavailable"} />
      </div>

      {latestValuation && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Admin Valuation
            </h2>
            <StatusBadge status={latestValuation.confidenceScore} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-primary">{formatPKR(latestValuation.finalEstimatedValue)}</p>
          <p className="mt-1 text-xs text-muted">{latestValuation.valuationMethod.replace(/_/g, " ")} · {new Date(latestValuation.valuationDate).toLocaleDateString("en-GB")}</p>
          {latestValuation.confidenceFactors && latestValuation.confidenceFactors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {latestValuation.confidenceFactors.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          )}

          {comparables.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Comparable Properties</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2">Property</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Price / Sq Ft</th>
                      <th className="py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparables.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="py-2 text-ink">{c.title || c.location || "—"}</td>
                        <td className="py-2 text-muted">{formatPKR(c.price)}</td>
                        <td className="py-2 text-muted">{c.pricePerSqft ? formatPKR(c.pricePerSqft) : "—"}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.isTransaction ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}`}>{c.isTransaction ? "CONFIRMED TRANSACTION" : "ASKING PRICE"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        {property.priceValue ? (
          <PropertyInvestmentAnalyzer propertyId={property.id} propertyTitle={property.title} purchasePrice={property.priceValue} scenarios={scenarios} settings={settings} isSignedIn={!!customer} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">Data unavailable — this property has no listed price to calculate from.</div>
        )}
      </div>

      <div className="mt-6">
        <InvestmentCrmActions propertyId={property.id} itemLabel={property.title} />
      </div>

      <div className="mt-4 text-center">
        <Link href="/compare" className="text-sm font-semibold text-primary hover:underline">
          Compare with other properties →
        </Link>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-surface-muted p-4 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> {settings.disclaimerText}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-lg font-extrabold text-ink">{value}</p>
    </div>
  );
}
