import { projectService } from "@/services/projectService";
import { ProjectsManager } from "@/components/admin/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await projectService.list();
  return <ProjectsManager projects={projects} />;
}
