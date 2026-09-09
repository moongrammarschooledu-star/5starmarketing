import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { updateProjectAction } from "@/lib/actions/projects.actions";
import { projectService } from "@/services/projectService";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await projectService.getById(id);
  if (!project) notFound();

  const boundAction = updateProjectAction.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Project</h1>
      <p className="mt-1 text-sm text-muted">{project.name}</p>

      <div className="mt-6">
        <ProjectForm action={boundAction} initialValues={project} />
      </div>
    </div>
  );
}
