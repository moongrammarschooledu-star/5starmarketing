import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { requireSection } from "@/lib/guard";
import { CreateBrochureForm } from "@/components/admin/CreateBrochureForm";

export const dynamic = "force-dynamic";

export default async function CreateBrochurePage() {
  await requireSection("brochures");

  const [properties, projects] = await Promise.all([
    propertyService.list().catch(() => []),
    projectService.list().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Create Brochure</h1>
      <p className="mt-1 text-sm text-muted">Select a property or project, choose sections, then preview and generate.</p>

      <div className="mt-6">
        <CreateBrochureForm properties={properties} projects={projects} />
      </div>
    </div>
  );
}
