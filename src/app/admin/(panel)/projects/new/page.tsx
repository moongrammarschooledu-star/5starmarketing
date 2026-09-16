import { ProjectForm } from "@/components/admin/ProjectForm";
import { createProjectAction } from "@/lib/actions/projects.actions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireSection("projects");
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Add Project</h1>
      <p className="mt-1 text-sm text-muted">Create a new project listing.</p>

      <div className="mt-6">
        <ProjectForm action={createProjectAction} />
      </div>
    </div>
  );
}
