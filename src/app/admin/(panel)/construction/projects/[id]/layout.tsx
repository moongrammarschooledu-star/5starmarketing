import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { constructionProjectService } from "@/services/constructionProjectService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConstructionProjectTabs } from "@/components/admin/construction/ConstructionProjectTabs";
import { ConstructionProjectStatusActions } from "@/components/admin/construction/ConstructionProjectStatusActions";
import { CONSTRUCTION_PROJECT_ALLOWED_TRANSITIONS } from "@/lib/models/construction";

export const dynamic = "force-dynamic";

export default async function ConstructionProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await requireSection("construction");
  const { id } = await params;
  const project = await constructionProjectService.getById(id);
  if (!project) notFound();

  return (
    <div>
      <Link href="/admin/construction/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{project.projectName}</h1>
          <p className="mt-1 text-sm text-muted">
            {project.projectNumber} · {project.projectType} {project.location ? `· ${project.location}` : ""}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-3">
        <ConstructionProjectStatusActions projectId={project.id} allowed={CONSTRUCTION_PROJECT_ALLOWED_TRANSITIONS[project.status]} />
      </div>

      <div className="mt-4">
        <ConstructionProjectTabs projectId={project.id} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
