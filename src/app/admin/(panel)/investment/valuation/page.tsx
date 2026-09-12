import Link from "next/link";
import { ArrowLeft, Plus, Download } from "lucide-react";
import { propertyValuationService } from "@/services/propertyValuationService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

const CONFIDENCE_STYLE: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-red-100 text-red-800",
};

export default async function AdminValuationsPage() {
  await requireSection("investment");
  const [valuations, admin] = await Promise.all([propertyValuationService.listRecent(50), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/investment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Investment
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Property Valuations</h1>
          <p className="mt-1 text-sm text-muted">Every valuation is an immutable, versioned record. Creating a new valuation for a property never overwrites its history.</p>
        </div>
        {canManage && (
          <Link href="/admin/investment/valuation/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> New Valuation
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Estimated Value</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {valuations.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{v.propertyTitle ?? "Property"}</td>
                <td className="px-4 py-3 text-muted">{v.valuationMethod.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-ink">{formatPKR(v.finalEstimatedValue)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CONFIDENCE_STYLE[v.confidenceScore]}`}>{v.confidenceScore}</span>
                </td>
                <td className="px-4 py-3 text-muted">v{v.version}</td>
                <td className="px-4 py-3 text-muted">{new Date(v.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <a href={`/admin/investment/valuation/${v.id}/report`} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <Download className="h-3.5 w-3.5" /> Report
                  </a>
                </td>
              </tr>
            ))}
            {valuations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No valuations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
