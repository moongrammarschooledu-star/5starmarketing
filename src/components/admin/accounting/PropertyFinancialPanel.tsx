import { Wallet } from "lucide-react";
import { accountingReportService } from "@/services/accountingReportService";
import { formatPKR } from "@/lib/calculator";

/** Property Financial Tab (STEP 23, section 51) — internal-only; never
 *  rendered on the public property page. Shows "Insufficient cost
 *  data" rather than inventing a cost figure when nothing has been
 *  logged against this property yet (section 34). */
export async function PropertyFinancialPanel({ propertyId }: { propertyId: string }) {
  const profitability = await accountingReportService.propertyProfitability(propertyId).catch(() => undefined);
  if (!profitability) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" /> Property Financials (admin-only — never shown publicly)
      </h2>
      {profitability.hasSufficientData ? (
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sale Revenue" value={formatPKR(profitability.saleRevenue)} />
          <Stat label="Costs" value={formatPKR(profitability.costs)} />
          <Stat label="Commission" value={formatPKR(profitability.commission)} />
          <Stat label="Profit" value={formatPKR(profitability.profit)} accent />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Insufficient cost data — record an expense against this property to see profitability.</p>
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
