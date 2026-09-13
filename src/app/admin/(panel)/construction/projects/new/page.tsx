import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { projectService } from "@/services/projectService";
import { customerService } from "@/services/customerService";
import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { NewConstructionProjectForm } from "@/components/admin/construction/NewConstructionProjectForm";

export const dynamic = "force-dynamic";

export default async function NewConstructionProjectPage() {
  await requireSection("construction");
  const [properties, projects, customers, supabase] = await Promise.all([propertyService.list(), projectService.list().catch(() => []), customerService.listAll().catch(() => []), createClient()]);
  const { data: staff } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <Link href="/admin/construction/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Construction Project</h1>

      <div className="mt-6">
        <NewConstructionProjectForm
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          referenceProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
          customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
          staff={staff ?? []}
        />
      </div>
    </div>
  );
}
