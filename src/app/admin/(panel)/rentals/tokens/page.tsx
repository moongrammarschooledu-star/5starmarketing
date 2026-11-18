import Link from "next/link";
import { ArrowLeft, FilePlus2, Pencil, Printer } from "lucide-react";
import { tokenReceiptService, type TokenReceiptRecord } from "@/services/tokenReceiptService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function TokenReceiptsPage() {
  await requireSection("rentals");
  let receipts: TokenReceiptRecord[] = [];
  let loadError: string | null = null;
  try {
    receipts = await tokenReceiptService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the token receipts.";
  }

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Token Receipts</h1>
          <p className="mt-1 text-sm text-muted">The proof you give a client who pays a token (advance) before the rent agreement. Print it or send it on WhatsApp.</p>
        </div>
        <Link href="/admin/rentals/tokens/new" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <FilePlus2 className="h-4 w-4" /> New Token Receipt
        </Link>
      </div>

      {loadError && <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{loadError}</div>}

      {!loadError && receipts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-heading text-base font-bold text-ink">No token receipts yet.</p>
        </div>
      ) : (
        !loadError && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink">{r.receiptNo}</td>
                    <td className="px-4 py-3 text-ink">{r.data.payer.name || r.data.payer.nameUr || "-"}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-muted">{r.data.property.description || r.data.property.descriptionUr || "-"}</td>
                    <td className="px-4 py-3 text-ink">{formatPKR(r.data.amount)}</td>
                    <td className="px-4 py-3 text-muted">{r.data.receiptDate ? new Date(r.data.receiptDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <a href={`/admin/rentals/tokens/${r.id}/print`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
                          <Printer className="h-3.5 w-3.5" /> Print
                        </a>
                        <Link href={`/admin/rentals/tokens/${r.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary">
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
