import { redirect, notFound } from "next/navigation";
import { projectService } from "@/services/projectService";
import { brochureService } from "@/services/brochureService";
import { requireSection } from "@/lib/guard";
import { brochureSectionKeys } from "@/lib/models/brochure";

export const dynamic = "force-dynamic";

// A one-click shortcut for a project: reuse its brochure if one already
// exists, otherwise create a default one (every section on) and drop the
// admin straight into the preview to fine-tune and generate.
export default async function ProjectBrochureShortcutPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("brochures");
  const { id } = await params;

  const project = await projectService.getById(id);
  if (!project) notFound();

  const existing = (await brochureService.list()).find((b) => b.projectId === id);
  if (existing) redirect(`/admin/brochures/preview/${existing.id}`);

  const created = await brochureService.create("project", id, `${project.name} Brochure`, [...brochureSectionKeys]);
  redirect(`/admin/brochures/preview/${created.id}`);
}
