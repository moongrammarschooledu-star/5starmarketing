import Link from "next/link";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";

export const metadata = { title: "Legal & Documents" };
export const dynamic = "force-dynamic";

export default async function CustomerLegalPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const deals = await dealService.listByCustomer(customer.id);
  const properties = Array.from(
    new Map(
      deals
        .filter((d) => d.propertyId)
        .map((d) => [d.propertyId as string, { id: d.propertyId as string, title: d.propertyTitle ?? "Property" }])
    ).values()
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal &amp; Documents</h1>
      <p className="mt-1 text-sm text-muted">
        Ownership, due-diligence and compliance status for your properties, based only on what has actually been recorded. This is not legal advice — always confirm with a licensed professional before making a decision.
      </p>

      {properties.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">No properties linked to your account yet.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {properties.map((p) => (
            <Link key={p.id} href={`/customer/legal/${p.id}`} className="block rounded-2xl border border-border bg-surface p-5 hover:border-primary">
              <p className="font-bold text-ink">{p.title}</p>
              <p className="mt-1 text-xs text-muted">View legal status, verified documents and notices</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
