import Link from "next/link";
import { ArrowLeft, FilePlus2, Pencil, Printer } from "lucide-react";
import { saleAgreementService, type SaleAgreementRecord } from "@/services/saleAgreementService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function SaleAgreementsPage() {
  await requireSection("deals");
  let agreements: SaleAgreementRecord[] = [];
  let loadError: string | null = null;
  try {
    agreements = await saleAgreementService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the sale agreements.";
  }

  return (
    <div>
      <Link href="/admin/deals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Sale Agreements</h1>
          <p className="mt-1 text-sm text-muted">Make an agreement to sell (bayana) in Urdu or English, with the company letterhead, ready to print on plain or stamp paper.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rentals/tokens/new?purpose=sale" className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
            Bayana receipt
          </Link>
          <Link href="/admin/deals/sale-agreements/new" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            <FilePlus2 className="h-4 w-4" /> New Sale Agreement
          </Link>
        </div>
      </div>

      {loadError && <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>}

      {!loadError && agreements.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-heading text-base font-bold text-ink">No sale agreements yet.</p>
        </div>
      ) : (
        !loadError && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink">{a.agreementNo}</td>
                    <td className="px-4 py-3 text-ink">{a.data.seller.name || a.data.seller.nameUr || "-"}</td>
                    <td className="px-4 py-3 text-ink">{a.data.buyer.name || a.data.buyer.nameUr || "-"}</td>
                    <td className="px-4 py-3 text-ink">{formatPKR(a.data.totalPrice)}</td>
                    <td className="px-4 py-3 text-muted">{a.data.agreementDate ? new Date(a.data.agreementDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="px-4 py-3 text-muted">
                      {a.data.language === "en" ? "English" : "Urdu"} · {a.data.paper === "stamp" ? "Stamp paper" : "Plain paper"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <a href={`/admin/deals/sale-agreements/${a.id}/print`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                          <Printer className="h-3.5 w-3.5" /> Print
                        </a>
                        <Link href={`/admin/deals/sale-agreements/${a.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                          <Pencil className="h-3.5 w-3.5" /> Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
