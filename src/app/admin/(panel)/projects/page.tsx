import { projectService } from "@/services/projectService";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requireSection("projects");
  const projects = await projectService.list();
  return <ProjectsManager projects={projects} />;
}
