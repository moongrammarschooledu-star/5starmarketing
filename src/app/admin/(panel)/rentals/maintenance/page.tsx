import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { RentalMaintenanceApprovalControl } from "@/components/admin/rentals/RentalMaintenanceApprovalControl";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalMaintenancePage() {
  const supabase = await createClient();
  const { data: rentalProps } = await supabase.from("rental_properties").select("property_id");
  const propertyIds = Array.from(new Set((rentalProps ?? []).map((r) => r.property_id)));

  const allOrders = await maintenanceWorkOrderService.list();
  const rentalOrders = allOrders.filter((o) => propertyIds.includes(o.propertyId));

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Maintenance</h1>
      <p className="mt-1 text-sm text-muted">
        Tenants submit requests via the existing{" "}
        <Link href="/admin/maintenance" className="font-bold text-primary hover:underline">
          Maintenance module
        </Link>
        . Work orders on rental properties can optionally require landlord approval below.
      </p>

      <div className="mt-6 space-y-2">
        {rentalOrders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">
                  {o.workOrderNumber} — {o.propertyTitle}
                </p>
                <p className="text-xs text-muted">
                  {o.description} {o.estimatedCost != null ? `· Est. ${formatPKR(o.estimatedCost)}` : ""}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-2">
              <RentalMaintenanceApprovalControl workOrderId={o.id} status={o.landlordApprovalStatus} approvedByName={o.landlordApprovedByName} />
            </div>
          </div>
        ))}
        {rentalOrders.length === 0 && <p className="text-sm text-muted">No maintenance work orders on rental properties yet.</p>}
      </div>
    </div>
  );
}
