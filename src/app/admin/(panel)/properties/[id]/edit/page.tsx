import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { PaymentPlanManager } from "@/components/admin/PaymentPlanManager";
import { updatePropertyAction } from "@/lib/actions/properties.actions";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { paymentPlanService } from "@/services/paymentPlanService";
import { dealService } from "@/services/dealService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, projects] = await Promise.all([
    propertyService.getById(id),
    projectService.list().catch(() => []),
  ]);
  if (!property) notFound();

  const plan = await paymentPlanService.getForPropertyAdmin(id);
  const scheduleItems = plan ? await paymentPlanService.listScheduleItems(plan.id) : [];
  const deals = await dealService.listByProperty(id).catch(() => []);

  const boundAction = updatePropertyAction.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Property</h1>
      <p className="mt-1 text-sm text-muted">{property.title}</p>

      {deals.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Handshake className="h-3.5 w-3.5" /> Linked Deals (admin-only — never shown publicly)
          </h2>
          <div className="mt-2.5 space-y-1.5">
            {deals.map((d) => (
              <Link key={d.id} href={`/admin/deals/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm hover:bg-surface-muted/70">
                <span className="font-semibold text-ink">{d.dealNumber}</span>
                <span className="text-muted">{formatPKR(d.finalAmount)}</span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <PropertyForm action={boundAction} initialValues={property} submitLabel="Save Changes" projects={projects} />
      </div>

      <div className="mt-6">
        <PaymentPlanManager propertyId={id} propertySlug={property.slug} plan={plan} scheduleItems={scheduleItems} />
      </div>
    </div>
  );
}
