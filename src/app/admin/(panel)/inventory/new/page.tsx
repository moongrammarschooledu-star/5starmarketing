import { projectService } from "@/services/projectService";
import { propertyService } from "@/services/propertyService";
import { InventoryForm } from "@/components/admin/inventory/InventoryForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewInventoryUnitPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  await requireSection("inventory");
  const { project } = await searchParams;
  const [projects, properties] = await Promise.all([projectService.list(), propertyService.list()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">New Inventory Unit</h1>
      <p className="mt-1 text-sm text-muted">Add a unit, plot or block to your project or property inventory.</p>

      <div className="mt-6 max-w-3xl">
        <InventoryForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} properties={properties.map((p) => ({ id: p.id, title: p.title }))} defaultProjectId={project} />
      </div>
    </div>
  );
}
