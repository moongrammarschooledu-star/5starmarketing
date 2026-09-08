import { projectsRepository } from "@/lib/repositories/projects.repository";
import { ProjectsManager } from "@/components/admin/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await projectsRepository.list();
  return <ProjectsManager projects={projects} />;
}
