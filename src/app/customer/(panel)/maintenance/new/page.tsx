import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { NewCustomerMaintenanceRequestForm } from "@/components/customer/maintenance/NewCustomerMaintenanceRequestForm";

export const metadata = { title: "New Maintenance Request" };
export const dynamic = "force-dynamic";

export default async function NewCustomerMaintenanceRequestPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const deals = await dealService.listByCustomer(customer.id);
  const properties = [...new Map(deals.filter((d) => d.propertyId).map((d) => [d.propertyId!, { id: d.propertyId!, title: d.propertyTitle ?? "Property", unitId: d.inventoryId }])).values()];

  return (
    <div>
      <Link href="/customer/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Maintenance Request</h1>

      {properties.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">You don&apos;t have any properties linked to your account yet — contact your agent if you need to submit a maintenance request.</div>
      ) : (
        <div className="mt-6">
          <NewCustomerMaintenanceRequestForm properties={properties} />
        </div>
      )}
    </div>
  );
}
