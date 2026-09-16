import { requireSection } from "@/lib/guard";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { LandingPageForm } from "@/components/admin/LandingPageForm";

export const dynamic = "force-dynamic";

export default async function NewLandingPagePage() {
  await requireSection("content");
  const [properties, projects] = await Promise.all([propertyService.list(), projectService.list()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">New Landing Page</h1>
      <div className="mt-6">
        <LandingPageForm
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
