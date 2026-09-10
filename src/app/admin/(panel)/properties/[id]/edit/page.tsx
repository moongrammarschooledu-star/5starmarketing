import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { PaymentPlanManager } from "@/components/admin/PaymentPlanManager";
import { updatePropertyAction } from "@/lib/actions/properties.actions";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { paymentPlanService } from "@/services/paymentPlanService";

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

  const boundAction = updatePropertyAction.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Property</h1>
      <p className="mt-1 text-sm text-muted">{property.title}</p>

      <div className="mt-6">
        <PropertyForm action={boundAction} initialValues={property} submitLabel="Save Changes" projects={projects} />
      </div>

      <div className="mt-6">
        <PaymentPlanManager propertyId={id} propertySlug={property.slug} plan={plan} scheduleItems={scheduleItems} />
      </div>
    </div>
  );
}
