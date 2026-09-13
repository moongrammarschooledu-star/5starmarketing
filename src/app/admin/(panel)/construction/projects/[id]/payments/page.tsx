import { constructionProjectService } from "@/services/constructionProjectService";
import { constructionExpenseService } from "@/services/constructionExpenseService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function ConstructionPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await constructionProjectService.getById(id);
  const [payments, expenses] = await Promise.all([
    project?.dealId ? dealPaymentService.listByDeal(project.dealId) : Promise.resolve([]),
    constructionExpenseService.list(id),
  ]);
  const paidExpenses = expenses.filter((e) => e.status === "PAID");

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Payments</h2>
      <p className="mt-1 text-xs text-muted">Payments are recorded through the existing Deals and Accounting modules — this is a read-only view, never a separate ledger.</p>

      <section className="mt-4">
        <h3 className="font-heading text-base font-bold text-ink">Customer Payments {project?.dealNumber ? `(${project.dealNumber})` : ""}</h3>
        {!project?.dealId && <p className="mt-2 text-sm text-muted">This project is not linked to a sales deal, so no customer payment history is available here.</p>}
        {project?.dealId && (
          <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Method</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-muted">{new Date(p.paymentDate).toLocaleDateString("en-GB")}</td>
                    <td className="px-3 py-2.5 text-muted">{p.paymentType}</td>
                    <td className="px-3 py-2.5 text-muted">{p.paymentMethod}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{formatPKR(p.amount)}</td>
                    <td className="px-3 py-2.5 text-muted">{p.status}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                      No payments recorded against this deal yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="font-heading text-base font-bold text-ink">Paid Construction Expenses</h3>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Paid To</th>
                <th className="px-3 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paidExpenses.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 text-ink">{e.description}</td>
                  <td className="px-3 py-2.5 text-muted">{e.category}</td>
                  <td className="px-3 py-2.5 text-muted">{e.vendorName ?? e.contractorName ?? "—"}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{formatPKR(e.amount)}</td>
                </tr>
              ))}
              {paidExpenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted">
                    No paid expenses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
