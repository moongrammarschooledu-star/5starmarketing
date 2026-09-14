import Link from "next/link";
import { customerService } from "@/services/customerService";
import { tenantService } from "@/services/tenantService";
import { leaseService } from "@/services/leaseService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const metadata = { title: "My Rental" };
export const dynamic = "force-dynamic";

export default async function CustomerRentalsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const tenant = await tenantService.getByCustomerId(customer.id);
  const leases = tenant ? await leaseService.list({ tenantId: tenant.id }) : [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Rental</h1>
      <p className="mt-1 text-sm text-muted">Your leases, rent schedule and payment history.</p>

      {!tenant && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">You are not currently registered as a tenant.</p>
        </div>
      )}

      {tenant && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leases.map((l) => (
            <Link key={l.id} href={`/customer/rentals/${l.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">
                    {l.propertyTitle} {l.unitNumber ? `— ${l.unitNumber}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{l.leaseNumber}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">{formatPKR(l.monthlyRent)}/mo</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(l.startDate).toLocaleDateString("en-GB")} – {new Date(l.endDate).toLocaleDateString("en-GB")}
              </p>
            </Link>
          ))}
          {leases.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-muted">No leases yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
