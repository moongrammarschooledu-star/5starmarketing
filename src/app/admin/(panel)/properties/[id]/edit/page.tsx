import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { updatePropertyAction } from "@/lib/actions/properties.actions";
import { propertyService } from "@/services/propertyService";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await propertyService.getById(id);
  if (!property) notFound();

  const boundAction = updatePropertyAction.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Property</h1>
      <p className="mt-1 text-sm text-muted">{property.title}</p>

      <div className="mt-6">
        <PropertyForm action={boundAction} initialValues={property} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
