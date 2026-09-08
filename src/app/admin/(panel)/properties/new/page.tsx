import { PropertyForm } from "@/components/admin/PropertyForm";
import { createPropertyAction } from "@/lib/actions/properties.actions";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Add Property</h1>
      <p className="mt-1 text-sm text-muted">Create a new property listing.</p>

      <div className="mt-6">
        <PropertyForm action={createPropertyAction} submitLabel="Create Property" />
      </div>
    </div>
  );
}
