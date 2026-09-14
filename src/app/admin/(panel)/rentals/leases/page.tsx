import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { leaseService } from "@/services/leaseService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalLeasesPage() {
  const leases = await leaseService.list();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Rentals
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Leases</h1>
        </div>
        <Link href="/admin/rentals/leases/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Lease
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Lease #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Landlord</th>
              <th className="px-4 py-3">Monthly Rent</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leases.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/rentals/leases/${l.id}`} className="font-semibold text-primary hover:underline">
                    {l.leaseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">
                  {l.propertyTitle} {l.unitNumber ? `— ${l.unitNumber}` : ""}
                </td>
                <td className="px-4 py-3 text-muted">{l.tenantName}</td>
                <td className="px-4 py-3 text-muted">{l.landlordName}</td>
                <td className="px-4 py-3 text-muted">{formatPKR(l.monthlyRent)}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(l.startDate).toLocaleDateString("en-GB")} – {new Date(l.endDate).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
            {leases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No leases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
