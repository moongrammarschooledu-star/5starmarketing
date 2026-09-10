import Link from "next/link";
import { notFound } from "next/navigation";
import { FileStack } from "lucide-react";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { updateProjectAction } from "@/lib/actions/projects.actions";
import { projectService } from "@/services/projectService";
import { documentService } from "@/services/documentService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await projectService.getById(id);
  if (!project) notFound();

  const documents = await documentService.listByProject(id).catch(() => []);
  const boundAction = updateProjectAction.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">Edit Project</h1>
      <p className="mt-1 text-sm text-muted">{project.name}</p>

      {documents.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <FileStack className="h-3.5 w-3.5" /> Confidential Project Documents (admin-only — separate from public marketing files below)
          </h2>
          <div className="mt-2.5 space-y-1.5">
            {documents.map((d) => (
              <Link key={d.id} href={`/admin/documents/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm hover:bg-surface-muted/70">
                <span className="truncate font-semibold text-ink">{d.title}</span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <ProjectForm action={boundAction} initialValues={project} />
      </div>
    </div>
  );
}
