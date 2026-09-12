import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { propertyValuationService } from "@/services/propertyValuationService";
import { formatPKR } from "@/lib/calculator";

/** Property Investment Tab — internal-only; never rendered on the
 *  public property page. Mirrors PropertyFinancialPanel's shape: shows
 *  the real latest valuation (if any), never a fabricated estimate. */
export async function PropertyInvestmentPanel({ propertyId }: { propertyId: string }) {
  const latest = await propertyValuationService.getLatestForProperty(propertyId).catch(() => undefined);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Investment &amp; Valuation (admin-only — never shown publicly)
        </h2>
        <Link href={`/admin/investment/valuation/new`} className="text-xs font-bold text-primary hover:underline">
          New Valuation
        </Link>
      </div>
      {latest ? (
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Estimated Value" value={formatPKR(latest.finalEstimatedValue)} accent />
          <Stat label="Method" value={latest.valuationMethod.replace(/_/g, " ")} />
          <Stat label="Confidence" value={latest.confidenceScore} />
          <Stat label="Version" value={`v${latest.version}`} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">No valuation on record yet for this property.</p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading text-sm font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
