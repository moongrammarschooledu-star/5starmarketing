import Link from "next/link";
import { Handshake } from "lucide-react";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const metadata = { title: "My Deals" };
export const dynamic = "force-dynamic";

export default async function CustomerDealsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const deals = await dealService.listByCustomer(customer.id);

  if (deals.length === 0) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">My Deals</h1>
        <p className="mt-1 text-sm text-muted">Every transaction linked to your account.</p>
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <Handshake className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">No deals yet.</h2>
          <p className="mt-1 text-sm text-muted">Once your consultant creates a deal for you, it will appear here.</p>
          <Link href="/properties" className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Deals</h1>
      <p className="mt-1 text-sm text-muted">Every transaction linked to your account.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => (
          <Link key={d.id} href={`/customer/deals/${d.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{d.dealNumber}</div>
                <div className="mt-0.5 text-xs text-muted">{d.propertyTitle ?? d.projectName ?? "—"}</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink">{formatPKR(d.finalAmount)}</span>
              <span className="text-xs text-muted">{d.outstandingAmount > 0 ? `${formatPKR(d.outstandingAmount)} due` : "Settled"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
