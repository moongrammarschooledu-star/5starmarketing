import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { requireSection } from "@/lib/guard";
import { NewMaintenanceRequestForm } from "@/components/admin/maintenance/NewMaintenanceRequestForm";

export const dynamic = "force-dynamic";

export default async function NewMaintenanceRequestPage() {
  await requireSection("maintenance");
  const properties = await propertyService.list();

  return (
    <div>
      <Link href="/admin/maintenance/requests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Maintenance Request</h1>
      <p className="mt-1 text-sm text-muted">Create a request on behalf of a property, staff member or walk-in report.</p>

      <div className="mt-6">
        <NewMaintenanceRequestForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} />
      </div>
    </div>
  );
}
