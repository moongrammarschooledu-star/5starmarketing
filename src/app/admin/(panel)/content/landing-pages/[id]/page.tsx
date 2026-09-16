import { notFound } from "next/navigation";
import { requireSection } from "@/lib/guard";
import { landingPageService } from "@/services/landingPageService";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { LandingPageForm } from "@/components/admin/LandingPageForm";

export const dynamic = "force-dynamic";

export default async function EditLandingPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("content");
  const { id } = await params;
  const [page, properties, projects] = await Promise.all([
    landingPageService.getById(id),
    propertyService.list(),
    projectService.list(),
  ]);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Landing Page</h1>
      <div className="mt-6">
        <LandingPageForm
          page={page}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
}
