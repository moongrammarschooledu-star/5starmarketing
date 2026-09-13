import Link from "next/link";
import { Plus } from "lucide-react";
import { customerService } from "@/services/customerService";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

export default async function CustomerMaintenancePage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const requests = await maintenanceRequestService.listForCustomer(customer.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Maintenance</h1>
          <p className="mt-1 text-sm text-muted">Submit and track maintenance requests for your property.</p>
        </div>
        <Link href="/customer/maintenance/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((r) => (
          <Link key={r.id} href={`/customer/maintenance/${r.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-ink">{r.requestNumber}</p>
                <p className="mt-0.5 text-xs text-muted">{r.category}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-3 line-clamp-2 text-xs text-muted">{r.description}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
          </Link>
        ))}
        {requests.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No maintenance requests yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
